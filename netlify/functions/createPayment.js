const fetch = require("node-fetch");
const crypto = require("crypto");
const admin = require("firebase-admin");

// 🔥 INIT FIREBASE (SAFE)
let db = null;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
      databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
  }
  db = admin.database();
} catch (e) {
  console.error("🔥 FIREBASE INIT ERROR:", e.message);
}

// 🔥 TIMEOUT FETCH
async function fetchWithTimeout(url, options, timeout = 10000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeout)
    )
  ]);
}

exports.handler = async (event) => {

  // 🔥 KEEP FUNCTION WARM
  if (event.httpMethod === "GET") {
    return { statusCode: 200, body: "alive" };
  }

  try {
    const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;

    if (!PAYMONGO_SECRET) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing PAYMONGO_SECRET" })
      };
    }

    const body = JSON.parse(event.body || "{}");

    const amount = Number(body.amount);
    const userId = body.uid;

    // 🔒 VALIDATION
    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Minimum deposit is 50" })
      };
    }

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing userId" })
      };
    }

    // 🔥 UNIQUE REFERENCE
    const reference = "cc_" + Date.now() + "_" + crypto.randomBytes(5).toString("hex");

    // =========================================
    // 🔥 STEP 1: SAVE FIRST (CRITICAL)
    // =========================================
    if (!db) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Database not ready" })
      };
    }

    await db.ref("transactions/" + reference).set({
      userId: userId,
      amount: amount,
      reference: reference,
      status: "PENDING",
      createdAt: Date.now()
    });

    console.log("✅ SAVED TRANSACTION:", reference);

    // =========================================
    // 🔥 STEP 2: CREATE PAYMONGO LINK
    // =========================================
    const res = await fetchWithTimeout("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64")
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            description: `ClickCoin Deposit (${userId})`,

            // 🔥 KEEP THIS
            remarks: reference,

            // 🔥 ADD THIS (CRITICAL FIX)
            metadata: {
              reference: reference,
              userId: userId
            }
          }
        }
      })
    });

    const data = await res.json();

    console.log("💳 PAYMONGO RESPONSE:", JSON.stringify(data));

    // 🔒 FAIL SAFE
    if (!data || !data.data || !data.data.attributes) {

      await db.ref("transactions/" + reference).remove();

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "PayMongo error",
          details: data
        })
      };
    }

    const checkout_url = data.data.attributes.checkout_url;

    if (!checkout_url) {

      await db.ref("transactions/" + reference).remove();

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "No checkout URL",
          details: data
        })
      };
    }

    // =========================================
    // 🔥 STEP 3: RETURN URL
    // =========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        reference,
        checkout_url
      })
    };

  } catch (err) {

    console.error("❌ CREATE PAYMENT ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};