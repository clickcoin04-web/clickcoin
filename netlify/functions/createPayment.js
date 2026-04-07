const fetch = require("node-fetch");
const crypto = require("crypto");
const { createTransaction } = require("./_transactions");

exports.handler = async (event) => {
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
  const userId = body.userId;

  // 🔥 VALIDATION (ADDED)
  if (!amount || isNaN(amount) || amount <= 0 || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid amount or userId" }),
    };
  }

  try {
    // 🔥 STRONGER REFERENCE (ANTI-GUESS)
    const reference =
      "cc_" +
      Date.now() +
      "_" +
      crypto.randomBytes(4).toString("hex");

    console.log("💰 Creating payment:", { userId, amount, reference });

    // 🔥 SAVE TRANSACTION FIRST (same logic mo)
    await createTransaction({
      userId,
      type: "deposit",
      amount,
      reference
    });

    // 🔥 TIMEOUT PROTECTION
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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
            amount: Math.round(amount * 100), // 🔥 ensure integer
            description: "Deposit",
            remarks: reference,
            metadata: {
              userId
            }
          },
        },
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();

    // 🔥 FAIL SAFE (ADDED)
    if (!data.data || !data.data.attributes) {
      console.error("❌ PayMongo error:", data);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Payment provider error",
          details: data
        }),
      };
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