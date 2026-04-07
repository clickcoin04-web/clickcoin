const { getDB } = require("./_db");

exports.handler = async (event) => {
  try {
    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }

    const userId = String(body.userId || "").trim();

    // 🔥 VALIDATION
    if (!userId || userId.length > 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid userId" })
      };
    }

    const db = await getDB();

    console.log("💰 Fetch balance:", userId);

    // 🔥 ATOMIC CREATE OR GET
    const result = await db.collection("users").findOneAndUpdate(
      { _id: userId },
      {
        $setOnInsert: {
          balance: 0,
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: "after",
        projection: { balance: 1 }
      }
    );

    const user = result.value;

    return {
      statusCode: 200,
      body: JSON.stringify({
        balance: user.balance || 0
      })
    };

  } catch (err) {
    console.error("❌ getBalance error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal error"
      })
    };
  }
};