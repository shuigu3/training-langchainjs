## 概要

LangChain.js の[How-to guides](https://js.langchain.com/docs/how_to/)を順番に実施する
[How to return structured data from a model](https://js.langchain.com/docs/how_to/structured_output/)をやってみました。

## 学んだこと

`.withStructuredOutput()`メソッドを用いることで事前に定義した構造化データ（JSON スキーマ, Zod スキーマ）をモデルから返すことができます。ただし、JSON スキーマを用いると直感的に理解が難しいため Zod スキーマを用いることをしたいと思います。

```js
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});
```

```js
import { z } from "zod";

const joke = z.object({
  setup: z.string().describe("The setup of the joke"),
  punchline: z.string().describe("The punchline to the joke"),
  rating: z.number().optional().describe("How funny the joke is, from 1 to 10"),
});

const structuredLlm = model.withStructuredOutput(joke);

await structuredLlm.invoke("Tell me a joke about cats");
```

```json
{
  "setup": "Why don't cats play poker in the wild?",
  "punchline": "Too many cheetahs.",
  "rating": 7
}
```

## 参考にしたページ

- [Ollama で Llama 3.1 Swallow 8B を動かす](https://zenn.dev/hellorusk/books/e56548029b391f/viewer/ollama2)
- [Zod Basic usage](https://zod.dev/?id=basic-usage)
