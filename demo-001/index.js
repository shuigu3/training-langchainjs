import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";

const model = new ChatOllama({
  model: "llama3.1",
});

const joke = z.object({
  setup: z.string().describe("The setup of the joke"),
  punchline: z.string().describe("The punchline of the joke"),
  rating: z.number().optional().describe("How funny the joke is, from 1 to 10"),
});

const structuredLlm = model.withStructuredOutput(joke);

const response = await structuredLlm.invoke("Tell me a joke about cats");

console.log(response);
