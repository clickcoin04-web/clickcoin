const fetch = require("node-fetch");
const crypto = require("crypto");
const admin = require("firebase-admin");

// 🔥 SAFE FIREBASE INIT
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
  console.error("FIREBASE INIT FAILED:", e.message);
}

// 🔥 TIMEOUT FETCH
async function fetchWithTimeout(url, options, timeout = 8000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeout)
    )
  ]);
}

exports.handler = async (event) => {

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

    if (!amount || amount < 50 || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid data" })
      };
    }

    const reference = "cc_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");

    // 🔥 CALL PAYMONGO FIRST (ALWAYS)
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
            description: "Deposit",
            remarks: reference
          }
        }
      })
    });

    const data = await res.json();

    console.log("PAYMONGO:", JSON.stringify(data));

    if (!data || !data.data || !data.data.attributes || !data.data.attributes.checkout_url) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "PayMongo failed",
          details: data
        })
      };
    }

    const checkout_url = data.data.attributes.checkout_url;

    // 🔥 SAVE OPTIONAL (HINDI SISIRA KAHIT MAG-FAIL)
    if (db) {
      try {
        await db.ref("transactions/" + reference).set({
          userId,
          amount,
          reference,
          status: "PENDING",
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("FIREBASE SAVE FAILED:", e.message);
      }
    }

    // 🔥 ALWAYS RETURN URL
    return {
      statusCode: 200,
      body: JSON.stringify({
        checkout_url
      })
    };

  } catch (err) {

    console.error("MAIN ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};