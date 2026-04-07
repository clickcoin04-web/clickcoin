const fetch = require("node-fetch");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "ok" };
  }

  try {

    const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
    const body = JSON.parse(event.body);

    const data = body.data;

    if (!data || data.attributes.type !== "payment.paid") {
      return { statusCode: 200 };
    }

    const paymentId = data.id;

    // 🔥 VERIFY FROM PAYMONGO (ANTI-FAKE)
    const verifyRes = await fetch(`https://api.paymongo.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64"),
      }
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.data || verifyData.data.attributes.status !== "paid") {
      console.log("❌ Fake payment blocked");
      return { statusCode: 200 };
    }

    const attributes = verifyData.data.attributes;

    const reference = attributes.remarks;
    const amount = attributes.amount / 100;

    // 🔥 FETCH ORIGINAL TRANSACTION
    const snap = await db.ref("transactions/" + reference).once("value");

    if (!snap.exists()) return { statusCode: 200 };

    const trx = snap.val();

    // 🔥 MATCH CHECK (ANTI-TAMPER)
    if (trx.amount !== amount) {
      console.log("❌ Amount mismatch blocked");
      return { statusCode: 200 };
    }

    if (trx.status === "COMPLETED") {
      return { statusCode: 200 };
    }

    // 🔥 MARK COMPLETE
    await db.ref("transactions/" + reference).update({
      status: "COMPLETED",
      paidAt: Date.now(),
      paymentId
    });

    // 🔥 WALLET CREDIT
    await db.ref("users/" + trx.userId).transaction(user => {
      if (user) {
        user.wallet = (user.wallet || 0) + amount;
      }
      return user;
    });

    console.log("✅ SECURE CREDIT:", trx.userId, amount);

    return { statusCode: 200, body: "verified" };

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return { statusCode: 500 };
  }
};