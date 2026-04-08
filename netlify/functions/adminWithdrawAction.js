const { getDB } = require("./_db");

exports.handler = async (event) => {
  try {
    const ADMIN_KEY = process.env.ADMIN_API_KEY;

    // ==========================
    // 🔒 ADMIN AUTH
    // ==========================
    const headers = event.headers || {};
    const providedKey = headers["x-admin-key"];

    if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
      return res(403, "Unauthorized");
    }

    // ==========================
    // 📦 PARSE BODY
    // ==========================
    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return res(400, "Invalid JSON");
    }

    const { withdrawId, action, reason } = body;

    if (!withdrawId || !["approve", "reject"].includes(action)) {
      return res(400, "Invalid withdrawId or action");
    }

    const db = await getDB();

    console.log("💸 Admin action:", { withdrawId, action });

    // ==========================
    // 🔥 ATOMIC LOCK (CRITICAL)
    // ==========================
    const result = await db.collection("withdraws").findOneAndUpdate(
      {
        withdrawId,
        status: "pending"
      },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          processedAt: new Date(),
          adminAction: action,
          reason: reason || null
        }
      },
      {
        returnDocument: "before"
      }
    );

    if (!result.value) {
      return res(400, "Already processed or not found");
    }

    const original = result.value;

    // ==========================
    // 🔁 REJECT → REFUND
    // ==========================
    if (action === "reject") {
      const refund = await db.collection("users").updateOne(
        {
          _id: original.userId
        },
        {
          $inc: { balance: original.amount }
        }
      );

      if (refund.modifiedCount !== 1) {
        console.error("❌ Refund failed", original.userId);

        return res(500, "Refund failed - manual check needed");
      }
    }

    // ==========================
    // 📊 UPDATE TRANSACTION LOG
    // ==========================
    await db.collection("transactions").updateMany(
      {
        userId: original.userId,
        type: "withdraw",
        amount: original.amount,
        status: "pending"
      },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          processedAt: new Date()
        }
      }
    );

    // ==========================
    // 📜 AUDIT LOG (IMPORTANT)
    // ==========================
    await db.collection("admin_logs").insertOne({
      type: "withdraw_action",
      withdrawId,
      action,
      adminKeyUsed: providedKey ? "YES" : "NO",
      userId: original.userId,
      amount: original.amount,
      createdAt: new Date()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action,
        withdrawId
      })
    };

  } catch (err) {
    console.error("❌ adminWithdrawAction error:", err);

    return res(500, "Internal error");
  }
};

// ==========================
// 🔧 HELPER
// ==========================
function res(code, message) {
  return {
    statusCode: code,
    body: JSON.stringify({ error: message })
  };
}