import { callAgent } from "./agent.js";

const main = async () => {
  const initialMessage = "what's the weather in the coolest cities?";
  const response = await callAgent(initialMessage);

  console.log("----------------------------------");
  console.log("Query:\n    ", initialMessage);
  console.log("");
  console.log("Answer:\n    ", response);
};
main();
