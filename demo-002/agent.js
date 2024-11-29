import { HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { ChatOllama } from "@langchain/ollama";
import "dotenv/config";
import { z } from "zod";

export async function callAgent(client, query, thread_id) {
  const dbName = "demo-002";
  const db = client.db(dbName);
  const collection = db.collection("employees");

  const GraphState = Annotation.Root({
    messages: Annotation({
      reducer: (state, action) => {
        return state.concat(action);
      },
    }),
  });

  const employeeLookupTool = tool(
    async ({ query, n = 10 }) => {
      console.log("Employee lookup tool called");

      //TODO: 意味を調べる
      const dbConfig = {
        collection: collection,
        indexName: "vector_index",
        textKey: "embedding_text",
        embeddingKey: "embedding",
      };

      const vectorStore = new MongoDBAtlasVectorSearch(
        new ChatOllama({ model: "llama3.1" }),
        dbConfig
      );

      const result = await vectorStore.similaritySearchVectorWithScore(
        query,
        n
      );
      return JSON.stringify(result);
    },
    {
      name: "employee_lookup",
      description: "Gathers employee details from the HR database",
      schema: z.object({
        query: z.string().describe("The search query"),
        n: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results to return"),
      }),
    }
  );

  const tools = [employeeLookupTool];

  const toolNode = new ToolNode(tools);

  const model = new ChatOllama({
    model: "llama3.1",
  }).bindTools(tools);

  function shouldContinue(state) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1];

    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
  }

  async function callModel(state) {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question. If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop. You have access to the following tools: {tool_names}.\n{system_message}\nCurrent time: {time}.Please answer in Japanese.`,
      ],
      new MessagesPlaceholder("messages"),
    ]);

    const formattedPrompt = await prompt.formatMessages({
      system_message: "You are helpful HR Chatbot Agent.",
      time: new Date().toISOString(),
      tool_names: tools.map((tool) => tool.name).join(", "),
      messages: state.messages,
    });

    const result = await model.invoke(formattedPrompt);

    return { messages: [result] };
  }

  const workflow = new StateGraph(GraphState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const checkpointer = new MongoDBSaver({ client, dbName });

  const app = workflow.compile({ checkpointer });

  const finalState = await app.invoke(
    {
      messages: [new HumanMessage(query)],
    },
    { recursionLimit: 15, configurable: { thread_id: thread_id } }
  );

  console.log(
    "Final state:",
    finalState.messages[finalState.messages.length - 1].content
  );
  return finalState.messages[finalState.messages.length - 1].content;
}
