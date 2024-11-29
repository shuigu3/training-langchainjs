import "dotenv/config";
import express from "express";
import { MongoClient } from "mongodb";
import { callAgent } from "./agent.js";

// JSON形式のリクエストボディを解析するためのミドルウェアを設定しています。
// これにより、リクエストの内容を簡単に扱えるようになります。
const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_ATLAS_URI);

async function main() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // ルートパスにアクセスがあった場合に、"LangGraph Agent Server"というレスポンスを返すように設定しています。
    app.get("/", (request, response) => {
      response.send("LangGraph Agent Server");
    });

    app.post("/chat", async (request, response) => {
      const initialMessage = request.body.message;
      const threadId = Date.now().toString();
      try {
        const result = await callAgent(client, initialMessage, threadId);
        response.json({ threadId, result });
      } catch (error) {
        console.error(error);
        response.status(500).send({ error: error.message });
      }
    });

    app.post("/chat/:threadId", async (req, res) => {
      const { threadId } = req.params;
      const { message } = req.body;
      try {
        const response = await callAgent(client, message, threadId);
        res.json({ response });
      } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ポート3000でサーバーを起動しています。
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}
main();
