const { getDB } = require("./_db");

exports.handler = async (event) => {
  try {
    const ADMIN_KEY = process.env.ADMIN_API_KEY;

    // 🔒 ADMIN AUTH (CRITICAL)
    const headers = event.headers || {};
    const providedKey = headers["x-admin-key"];

    if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON" })
      };
    }

    const { withdrawId, action } = body;

    // 🔥 VALIDATION
    if (!withdrawId || !["approve", "reject"].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid withdrawId or action" })
      };
    }

    const db = await getDB();

    console.log("💸 Admin action:", { withdrawId, action });

    // 🔥 ATOMIC UPDATE (LOCK)
    const withdraw = await db.collection("withdraws").findOneAndUpdate(
      {
        withdrawId,
        status: "pending"
      },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          processedAt: new Date()
        }
      },
      { returnDocument: "before" } // get original
    );

    if (!withdraw.value) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Already processed or not found" })
      };
    }

    const original = withdraw.value;

    // 🔥 HANDLE REJECT (RETURN BALANCE)
    if (action === "reject") {
      const user = await db.collection("users").findOne({ _id: original.userId });

      if (!user) {
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "User not found" })
        };
      }

      await db.collection("users").updateOne(
        { _id: original.userId },
        { $inc: { balance: original.amount } }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error("❌ adminWithdrawAction error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal error"
      })
    };
  }
};