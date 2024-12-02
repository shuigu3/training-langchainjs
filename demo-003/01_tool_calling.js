import { AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getCoolestCities, getWeather } from "./tools.js";

const tools = [getWeather, getCoolestCities];
const toolNode = new ToolNode(tools);

// Tool単体で呼び出しを行うことで、Toolの動作確認などに利用できる
const messageWithSingleToolCall = new AIMessage({
  content: "",
  tool_calls: [
    {
      name: "get_weather",
      args: { location: "sf" },
      id: "tool_call_id",
      type: "tool_call",
    },
  ],
});
const result = await toolNode.invoke({ messages: [messageWithSingleToolCall] });
console.log(result);

console.log("---------------------");

const messageWithMultipleToolCalls = new AIMessage({
  content: "",
  tool_calls: [
    {
      name: "get_coolest_cities",
      args: {},
      id: "tool_call_id",
      type: "tool_call",
    },
    {
      name: "get_weather",
      args: { location: "sf" },
      id: "tool_call_id_2",
      type: "tool_call",
    },
  ],
});

console.log(
  await toolNode.invoke({ messages: [messageWithMultipleToolCalls] })
);
