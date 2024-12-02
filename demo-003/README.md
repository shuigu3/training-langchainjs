## 概要

LangChain.js の[How-to guides](https://js.langchain.com/docs/how_to/)を順番に実施する
[How to call tools using ToolNode](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)をやってみました。

## 学んだこと

### 想定した結果にならない

おそらく System メッセージを調整することで実現可能かもしれないが構成のな Model にするだけで変わる可能性もあるためココで終了

### Model について

Model には Tool Calling に対応しているものとそうでないものがある
https://github.com/ollama/ollama/issues/5793

### Setuup

```sh
npm install @langchain/langgraph @langchain/core zod @langchain/ollama
```

### Tool の定義

```js
const getWeather = tool(
  (input) => {
    if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
      return "It's 60 degrees and foggy.";
    } else {
      return "It's 90 degrees and sunny.";
    }
  },
  {
    name: "get_weather",
    description: "Call to get the current weather.",
    schema: z.object({
      location: z.string().describe("Location to get the weather for."),
    }),
  }
);

const getCoolestCities = tool(
  () => {
    return "nyc, sf";
  },
  {
    name: "get_coolest_cities",
    description: "Get a list of coolest cities",
    schema: z.object({
      noOp: z.string().optional().describe("No-op parameter."),
    }),
  }
);

const tools = [getWeather, getCoolestCities];
const toolNode = new ToolNode(tools);
```

### Tool 単体を呼び出すことで、Tool の動作確認などに利用できる

複数の Tool を呼び出したい場合は[ココ](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/#manually-call-toolnode)を参照します

```js
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
```
