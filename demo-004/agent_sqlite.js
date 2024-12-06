import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AzureChatOpenAI } from "@langchain/openai";
import "dotenv/config";
import { getCoolestCities, getWeather } from "./tools.js";
import { HumanMessage } from "@langchain/core/messages";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";

export const callAgent = async (query) => {
  const tools = [getCoolestCities, getWeather];
  const toolNode = new ToolNode(tools);

  const checkpointer = SqliteSaver.fromConnString(":memory:");

  const model = new AzureChatOpenAI({
    model: "gpt-4o",
    temperature: 0,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  }).bindTools(tools);

  const shouldContinue = (state) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if (
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls?.length
    ) {
      return "tools";
    }
    return END;
  };

  const callModel = async (state) => {
    const { messages } = state;
    const response = await model.invoke(messages);
    return { messages: response };
  };

  const workflow = new StateGraph(MessagesAnnotation)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent");

  const app = workflow.compile({ checkpointer });

  const config = { configurable: { thread_id: "2" }, streamMode: "values" };
  const finalState = await app.stream(
    { messages: [new HumanMessage(query)] },
    config
  );

  const events = [];
  // Debug Message
  for await (const chunk of finalState) {
    const lastMessage = chunk.messages[chunk.messages.length - 1];
    const type = lastMessage._getType();
    const content = lastMessage.content;
    const toolCalls = lastMessage.tool_calls;
    console.dir(
      {
        type,
        content,
        toolCalls,
      },
      { depth: null }
    );

    events.push(chunk);
  }

  console.log("==================================================");
  console.log(" Checkpointed Events");
  console.log("==================================================");

  const temp = await checkpointer.get(config);
  for (const event of temp.channel_values.messages) {
    const type = event._getType();
    const name = event.name;
    const content = event.content;
    const toolCalls = event.tool_calls;
    console.dir(
      {
        type,
        name,
        content,
        toolCalls,
      },
      { depth: null }
    );
  }

  // TODO: events配列を利用しない方法があると思うが見つかりませんでした
  const event = events[events.length - 1];
  return event.messages[event.messages.length - 1].content;
};
