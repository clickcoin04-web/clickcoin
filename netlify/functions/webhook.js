const admin = require("firebase-admin");

// 🔐 INIT FIREBASE (SAFE FOR NETLIFY)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: serviceAccount.databaseURL // IMPORTANT
    });
  } catch (err) {
    console.error("Firebase init error:", err);
  }
}

const db = admin.database();

exports.handler = async (event) => {
  try {
    // ✅ PARSE BODY (SAFE)
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        body: "Invalid JSON"
      };
    }

    // ✅ CHECK EVENT TYPE
    const eventType = body?.data?.attributes?.type;

    if (eventType !== "payment.paid") {
      return {
        statusCode: 200,
        body: "Ignored"
      };
    }

    // ✅ PAYMENT DATA
    const paymentData = body.data.attributes.data.attributes;

    const amount = paymentData.amount / 100;
    const uid = paymentData.metadata?.uid;

    if (!uid) {
      return {
        statusCode: 400,
        body: "Missing UID"
      };
    }

    // 🔥 UNIQUE PAYMENT ID (IMPORTANT PARA DI MA DOUBLE CREDIT)
    const paymentId = body.data.id;

    const depositRef = db.ref("deposits/" + paymentId);

    const existing = await depositRef.once("value");

    if (existing.exists()) {
      return {
        statusCode: 200,
        body: "Already processed"
      };
    }

    // 🔥 SAVE DEPOSIT
    await depositRef.set({
      uid: uid,
      amount: amount,
      status: "SUCCESS",
      time: Date.now()
    });

    // 🔥 ATOMIC WALLET UPDATE (IMPORTANT)
    const userRef = db.ref("users/" + uid + "/wallet");

    await userRef.transaction((current) => {
      return (current || 0) + amount;
    });

    return {
      statusCode: 200,
      body: "OK"
    };

  } catch (err) {
    console.error("Webhook error:", err);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};