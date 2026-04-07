const { getDB } = require("./_db");
const crypto = require("crypto");

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
    const amount = Number(body.amount);
    const gcash = String(body.gcash || "").trim();

    // 🔥 VALIDATION
    if (!userId || !amount || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid amount or userId" })
      };
    }

    // 🔥 GCASH BASIC VALIDATION (PH format)
    if (!/^09\d{9}$/.test(gcash)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid GCash number" })
      };
    }

    const db = await getDB();

    console.log("💸 Withdraw request:", { userId, amount });

    // 🔒 ATOMIC BALANCE DEDUCT (IMPORTANT FIX)
    const result = await db.collection("users").findOneAndUpdate(
      {
        _id: userId,
        balance: { $gte: amount } // 🔥 ensures enough balance
      },
      {
        $inc: { balance: -amount }
      },
      {
        returnDocument: "after"
      }
    );

    if (!result.value) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Insufficient balance" })
      };
    }

    // 🔥 SAFE UNIQUE ID
    const withdrawId =
      "wd_" +
      Date.now() +
      "_" +
      crypto.randomBytes(3).toString("hex");

    const withdraw = {
      withdrawId,
      userId,
      amount,
      gcash,
      status: "pending",
      createdAt: new Date()
    };

    await db.collection("withdraws").insertOne(withdraw);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Withdraw request submitted",
        withdrawId
      })
    };

  } catch (err) {
    console.error("❌ requestWithdraw error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal error"
      })
    };
  }
};