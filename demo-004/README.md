## 概要

LangGraph.js の Tool calling を試してみた結果をサマリで実装したい

## Set up

```shell
npm install @langchain/langgraph @langchain/core zod @langchain/openai zod
npm install dotenv
```

## やりたいこと

- [x] checkpoint を実装してみる
- [ ] checkpoint を Azure Database for PostgreSQL に変更する

## checkpoint を実装してみる

### Setup

```shell
npm install @langchain/langgraph-checkpoint-sqlite
```

### やったこと

- sqlite の checkpoint を導入
- thread_id を追加
- Checkpoint より途中経過を取得

### 参考にしたページ

- [Checkpoint 一覧](https://github.com/langchain-ai/langgraphjs/tree/main/libs)
- [sqlite Checkpoint README](https://github.com/langchain-ai/langgraphjs/tree/main/libs/checkpoint-sqlite)
- [LangGraph の会話履歴を SQLite に保持しよう(Python)](https://www.creationline.com/tech-blog/chatgpt-ai/75797)

## checkpoint を Azure Database for PostgreSQL に変更する

### Setup

Azure Database for PostgreSQL はデプロイメントが２つあるが、電源の On/Off でコスト最適化できる Azure Database for PostgreSQL フレキシブル サーバーを利用する

```shell
npm install @langchain/langgraph-checkpoint-postgres
```
