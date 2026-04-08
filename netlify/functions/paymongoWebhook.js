const fetch = require("node-fetch");
const crypto = require("crypto");
const admin = require("firebase-admin");

// ==========================
// 🔥 INIT FIREBASE
// ==========================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

// ==========================
// 🔥 LOGGER
// ==========================
async function log(step, data) {
  try {
    const id = Date.now() + "_" + Math.random().toString(16).slice(2);

    await db.ref("webhook_logs/" + id).set({
      step,
      data,
      time: new Date().toISOString()
    });
  } catch (e) {}
}

// ==========================
// 🔐 SIGNATURE VERIFY (STRICT)
// ==========================
function verifySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return signature === expected; // 🔥 exact match only
}

// ==========================
// 🔍 VERIFY PAYMENT
// ==========================
async function verifyPayment(paymentId, secret) {
  try {
    const res = await fetch(`https://api.paymongo.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: "Basic " + Buffer.from(secret + ":").toString("base64"),
      }
    });

    const data = await res.json();

    if (data?.data?.attributes?.status === "paid") {
      return data;
    }

    return null;

  } catch {
    return null;
  }
}

// ==========================
// 🚀 MAIN
// ==========================
exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return { statusCode: 200 };
  }

  try {

    const rawBody = event.body;

    const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
    const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

    const signature = event.headers["paymongo-signature"];

    await log("STEP_1_RECEIVED", rawBody);

    // ==========================
    // 🔐 STRICT SIGNATURE
    // ==========================
    if (!verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
      await log("INVALID_SIGNATURE", signature);
      return { statusCode: 400 };
    }

    const body = JSON.parse(rawBody);
    const data = body.data;

    const eventType = data?.attributes?.type;

    await log("STEP_2_EVENT", eventType);

    // 🔥 ONLY ACCEPT PAID
    if (eventType !== "payment.paid") {
      return { statusCode: 200 };
    }

    const paymentId = data?.attributes?.data?.id;

    if (!paymentId) {
      await log("NO_PAYMENT_ID", data);
      return { statusCode: 200 };
    }

    // ==========================
    // 🔍 VERIFY FROM PAYMONGO
    // ==========================
    const verifyData = await verifyPayment(paymentId, PAYMONGO_SECRET);

    if (!verifyData) {
      await log("VERIFY_FAILED", paymentId);
      return { statusCode: 200 };
    }

    const attr = verifyData.data.attributes;

    const reference = attr.remarks || attr.metadata?.reference;
    const amount = attr.amount / 100;

    if (!reference) {
      await log("NO_REFERENCE", attr);
      return { statusCode: 200 };
    }

    // ==========================
    // 🔒 IDEMPOTENCY LOCK
    // ==========================
    const trxRef = db.ref("transactions/" + reference);

    const trxSnap = await trxRef.once("value");

    if (!trxSnap.exists()) {
      await log("TRX_NOT_FOUND", reference);
      return { statusCode: 200 };
    }

    const trx = trxSnap.val();

    if (trx.status === "COMPLETED") {
      await log("ALREADY_DONE", reference);
      return { statusCode: 200 };
    }

    if (Number(trx.amount) !== Number(amount)) {
      await log("AMOUNT_MISMATCH", { trx: trx.amount, amount });
      return { statusCode: 200 };
    }

    // ==========================
    // 🔥 ATOMIC PROCESS (CRITICAL)
    // ==========================
    const processRef = db.ref("processing/" + reference);

    const lock = await processRef.transaction(current => {
      if (current) return; // already processing
      return { started: Date.now() };
    });

    if (!lock.committed) {
      await log("LOCKED_ALREADY", reference);
      return { statusCode: 200 };
    }

    // ==========================
    // 💰 WALLET UPDATE
    // ==========================
    await db.ref("users/" + trx.userId).transaction(user => {

      if (!user) return user;

      const now = Date.now();

      user.wallet = (user.wallet || 0) + amount;
      user.totalDeposit = (user.totalDeposit || 0) + amount;

      if (!user.investment) {
        user.investment = {
          capital: amount,
          start: now,
          lastClaim: 0,
          days: 0
        };
      } else {
        user.investment.capital =
          (user.investment.capital || 0) + amount;
      }

      return user;
    });

    // ==========================
    // ✅ MARK COMPLETE
    // ==========================
    await trxRef.update({
      status: "COMPLETED",
      paidAt: Date.now(),
      paymentId
    });

    await log("PAYMENT_SUCCESS", reference);

    // ==========================
    // 🎯 REFERRAL
    // ==========================
    await handleReferral(trx.userId, amount);

    return {
      statusCode: 200,
      body: "SUCCESS"
    };

  } catch (err) {
    await log("FATAL", err.message);
    return { statusCode: 500 };
  }
};

// ==========================
// 💸 REFERRAL (SAFE)
// ==========================
async function handleReferral(userId, amount) {
  try {

    const userSnap = await db.ref("users/" + userId).once("value");
    const user = userSnap.val();

    if (!user || !user.referrer) return;

    const levels = [
      { uid: user.referrer, percent: 0.15 },
      { percent: 0.05 },
      { percent: 0.02 }
    ];

    let current = user.referrer;

    for (let i = 0; i < levels.length; i++) {

      if (!current) break;

      const commission = amount * levels[i].percent;

      await db.ref("users/" + current).transaction(u => {
        if (!u) return u;
        u.wallet = (u.wallet || 0) + commission;
        return u;
      });

      const snap = await db.ref("users/" + current).once("value");
      current = snap.val()?.referrer;
    }

  } catch {}
}