const fetch = require("node-fetch");
const crypto = require("crypto");
const admin = require("firebase-admin");

// 🔥 INIT FIREBASE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async (event) => {

  // ⚡ PRE-WARM (para walang cold start delay)
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: "warm"
    };
  }

  const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;

  if (!PAYMONGO_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing API key" }),
    };
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const amount = Number(body.amount);
  const userId = body.uid;

  // 🔥 BASIC VALIDATION
  if (!amount || isNaN(amount) || amount <= 0 || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid amount or uid" }),
    };
  }

  // 🔥 LIMIT MAX AMOUNT
  if (amount > 50000) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Limit exceeded" })
    };
  }

  try {

    // 🔥 ANTI-SPAM (10 sec cooldown)
    const lastRef = await db.ref("users/" + userId + "/lastPayment").once("value");

    if (lastRef.exists()) {
      const lastTime = lastRef.val();
      if (Date.now() - lastTime < 10000) {
        return {
          statusCode: 429,
          body: JSON.stringify({ error: "Too many requests" })
        };
      }
    }

    await db.ref("users/" + userId + "/lastPayment").set(Date.now());

    // 🔥 BLOCK MULTIPLE PENDING
    const existing = await db.ref("transactions")
      .orderByChild("userId")
      .equalTo(userId)
      .once("value");

    let active = false;

    existing.forEach(c => {
      if (c.val().status === "PENDING") active = true;
    });

    if (active) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Pending payment exists" })
      };
    }

    // 🔥 GENERATE SECURE REFERENCE
    const reference =
      "cc_" +
      Date.now() +
      "_" +
      crypto.randomBytes(4).toString("hex");

    console.log("💰 Creating payment:", { userId, amount, reference });

    // 🔥 SAVE TRANSACTION
    await db.ref("transactions/" + reference).set({
      userId,
      amount,
      type: "deposit",
      status: "PENDING",
      createdAt: Date.now()
    });

    // ⚡ FAST FETCH (NO DELAY)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64"),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            description: "ClickCoin Deposit",
            remarks: reference,
            metadata: { userId }
          },
        },
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();

    // 🔥 FAIL SAFE
    if (!data.data || !data.data.attributes) {
      console.error("❌ PayMongo error:", data);
      throw new Error("Payment provider error");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkout_url: data.data.attributes.checkout_url,
        reference
      }),
    };

  } catch (err) {
    console.error("❌ createPayment error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal error"
      }),
    };
  }
};