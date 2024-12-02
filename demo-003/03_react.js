import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import { getCoolestCities, getWeather } from "./tools.js";

const tools = [getCoolestCities, getWeather];
const modelWithTools = new ChatOllama({
  model: "llama3.2",
  temperature: 0,
}).bindTools(tools);
const toolNodeForGraph = new ToolNode(tools);

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
  const response = await modelWithTools.invoke(messages);
  return { messages: response };
};

const callModel2 = async (state) => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question.If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop.You have access to the following tools: {tool_names}.\n{system_message}\n`,
    ],
    new MessagesPlaceholder("messages"),
  ]);
  // `あなたは他のアシスタントと協力している有能なAIアシスタントです。質問に答えるために提供されたツールを使用してください。完全に答えられない場合は、それで問題ありません。別のツールを持つ他のアシスタントがあなたの進めたところから助けます。進展するために実行できることを実行してください。あなたまたは他のアシスタントが最終的な答えや成果物を持っている場合、チームが停止することを知るために、応答の前に「最終回答」と付けてください。以下のツールにアクセスできます: {tool_names}。\n{system_message}\n現在の時刻: {time}。日本語で答えてください。`,
  const formattedPrompt = await prompt.formatMessages({
    system_message: "You are helpful Chatbot Agent.",
    tool_names: tools.map((tool) => tool.name).join(", "),
    messages: state.messages,
  });

  const result = await modelWithTools.invoke(formattedPrompt);
  return { messages: [result] };
};

const workflow = new StateGraph(MessagesAnnotation)
  // Define the two nodes we will cycle between
  .addNode("agent", callModel)
  .addNode("tools", toolNodeForGraph)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent");

const app = workflow.compile();

// example with a single tool call
// const stream = await app.stream(
//   {
//     messages: [{ role: "user", content: "what's the weather in sf?" }],
//   },
//   {
//     streamMode: "values",
//     configurable: { thread_id: "thread_id" },
//   }
// );
// for await (const chunk of stream) {
//   const lastMessage = chunk.messages[chunk.messages.length - 1];
//   const type = lastMessage._getType();
//   const content = lastMessage.content;
//   const toolCalls = lastMessage.tool_calls;
//   console.dir(
//     {
//       type,
//       content,
//       toolCalls,
//     },
//     { depth: null }
//   );
// }

// example with a multiple tool calls in succession
const streamWithMultiToolCalls = await app.stream(
  {
    messages: [
      { role: "user", content: "what's the weather in the coolest cities?" },
    ],
  },
  {
    streamMode: "values",
  }
);
for await (const chunk of streamWithMultiToolCalls) {
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
}
