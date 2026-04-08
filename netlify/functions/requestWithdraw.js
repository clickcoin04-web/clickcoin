const { getDB } = require("./_db");
const crypto = require("crypto");

const MIN_WITHDRAW = 100; // 🔥 pwede mo baguhin
const FEE_PERCENT = 0.10; // 🔥 10%

exports.handler = async (event) => {
  try {
    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, "Invalid JSON");
    }

    const userId = String(body.userId || "").trim();
    const amount = Number(body.amount);
    const gcash = String(body.gcash || "").trim();

    // ==========================
    // 🔒 VALIDATION
    // ==========================
    if (!userId || !amount || isNaN(amount)) {
      return response(400, "Invalid input");
    }

    if (amount < MIN_WITHDRAW) {
      return response(400, `Minimum withdraw is ${MIN_WITHDRAW}`);
    }

    if (!/^09\d{9}$/.test(gcash)) {
      return response(400, "Invalid GCash number");
    }

    const db = await getDB();

    // ==========================
    // 🧠 ANTI-SPAM (COOLDOWN)
    // ==========================
    const lastWithdraw = await db
      .collection("withdraws")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    if (lastWithdraw.length > 0) {
      const lastTime = new Date(lastWithdraw[0].createdAt).getTime();
      const now = Date.now();

      if (now - lastTime < 60 * 1000) {
        return response(429, "Please wait before another request");
      }
    }

    // ==========================
    // 💰 CALCULATE FEE
    // ==========================
    const fee = Math.floor(amount * FEE_PERCENT);
    const netAmount = amount - fee;

    if (netAmount <= 0) {
      return response(400, "Invalid withdraw amount after fee");
    }

    console.log("💸 Withdraw request:", {
      userId,
      amount,
      fee,
      netAmount
    });

    // ==========================
    // 🔥 ATOMIC BALANCE DEDUCT
    // ==========================
    const result = await db.collection("users").findOneAndUpdate(
      {
        _id: userId,
        balance: { $gte: amount }
      },
      {
        $inc: { balance: -amount }
      },
      {
        returnDocument: "after"
      }
    );

    if (!result.value) {
      return response(400, "Insufficient balance");
    }

    // ==========================
    // 🔐 UNIQUE ID
    // ==========================
    const withdrawId =
      "wd_" +
      Date.now() +
      "_" +
      crypto.randomBytes(4).toString("hex");

    // ==========================
    // 📝 SAVE WITHDRAW
    // ==========================
    const withdraw = {
      withdrawId,
      userId,
      amount,       // original
      fee,          // system fee
      netAmount,    // user receive
      gcash,
      status: "pending",
      createdAt: new Date()
    };

    await db.collection("withdraws").insertOne(withdraw);

    // ==========================
    // 📊 TRANSACTION LOG (IMPORTANT)
    // ==========================
    await db.collection("transactions").insertOne({
      type: "withdraw",
      userId,
      amount,
      fee,
      netAmount,
      status: "pending",
      createdAt: new Date()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Withdraw request submitted",
        withdrawId,
        netAmount
      })
    };

  } catch (err) {
    console.error("❌ requestWithdraw error:", err);

    return response(500, "Internal error");
  }
};

// ==========================
// 🔧 HELPER
// ==========================
function response(code, message) {
  return {
    statusCode: code,
    body: JSON.stringify({ error: message })
  };
}