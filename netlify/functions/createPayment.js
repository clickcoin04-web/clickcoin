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

  // ⚡ PRE-WARM
  if (event.httpMethod === "GET") {
    return { statusCode: 200, body: "warm" };
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

    if (!amount || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid data" })
      };
    }

    // 🔥 GENERATE REFERENCE
    const reference = "cc_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");

    // 🔥 SAVE TRANSACTION
    await db.ref("transactions/" + reference).set({
      userId,
      amount,
      status: "PENDING",
      createdAt: Date.now()
    });

    // 🔥 PAYMONGO REQUEST
    const res = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64")
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            description: "Deposit",
            remarks: reference
          }
        }
      })
    });

    const data = await res.json();

    // 🔥 LOG FULL RESPONSE
    console.log("PAYMONGO RESPONSE:", JSON.stringify(data));

    // 🔥 CHECK
    if (!data.data) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Payment failed",
          details: data
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkout_url: data.data.attributes.checkout_url
      })
    };

  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};