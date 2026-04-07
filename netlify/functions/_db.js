const { MongoClient } = require("mongodb");

let cachedClient = null;
let cachedDB = null;

async function connectDB() {
  if (cachedClient && cachedDB) {
    return { client: cachedClient, db: cachedDB };
  }

  if (!process.env.MONGO_URI) {
    throw new Error("❌ MONGO_URI is missing in environment variables");
  }

  try {
    const client = new MongoClient(process.env.MONGO_URI);

    await client.connect();

    const db = client.db("clickcoin");

    cachedClient = client;
    cachedDB = db;

    console.log("✅ MongoDB connected");

    return { client, db };

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);

    // 🔥 RETRY ONCE (important sa cold start)
    try {
      console.log("🔄 Retrying MongoDB connection...");

      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const db = client.db("clickcoin");

      cachedClient = client;
      cachedDB = db;

      console.log("✅ MongoDB connected (retry success)");

      return { client, db };

    } catch (retryErr) {
      console.error("❌ Retry failed:", retryErr);
      throw retryErr;
    }
  }
}

async function getDB() {
  const { db } = await connectDB();
  return db;
}

module.exports = { getDB };