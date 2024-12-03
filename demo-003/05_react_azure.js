
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AzureChatOpenAI } from "@langchain/openai";
import { getCoolestCities, getWeather } from "./tools.js";
import "dotenv/config";

const tools = [getCoolestCities, getWeather];
const modelWithTools = new AzureChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY, // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_INSTANCE_NAME
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME, // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION, // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
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
      messages: [{ role: "user", content: "what's the weather in the coolest cities?" }],
  },
  {
    streamMode: "values"
  }
)
for await (const chunk of streamWithMultiToolCalls) {
  const lastMessage = chunk.messages[chunk.messages.length - 1];
  const type = lastMessage._getType();
  const content = lastMessage.content;
  const toolCalls = lastMessage.tool_calls;
  console.dir({
    type,
    content,
    toolCalls
  }, { depth: null });
}