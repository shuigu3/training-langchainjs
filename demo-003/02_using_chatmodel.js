import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";
import { getCoolestCities, getWeather } from "./tools.js";

const tools = [getWeather, getCoolestCities];
const toolNode = new ToolNode(tools);

const modelWithTools = new ChatOllama({ model: "llama3.1" }).bindTools(tools);
const responseMessage = await modelWithTools.invoke(
  "what's the weather in sf?"
);
// 推論した結果を表示
console.log(responseMessage.tool_calls);
