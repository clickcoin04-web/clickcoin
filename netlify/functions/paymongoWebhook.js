const fetch = require("node-fetch");
const crypto = require("crypto");
const admin = require("firebase-admin");

// ========================================
// 🔥 INIT FIREBASE (SAFE)
// ========================================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

// ========================================
// 🔥 LOGGER
// ========================================
async function logDebug(step, data) {
  try {
    const id = Date.now() + "_" + Math.random().toString(16).slice(2);

    await db.ref("webhook_logs/" + id).set({
      step,
      data,
      time: new Date().toISOString()
    });
  } catch (e) {
    console.error("LOG FAIL:", e.message);
  }
}

// ========================================
// 🔥 VERIFY PAYMENT (WITH RETRY)
// ========================================
async function verifyPayment(paymentId, secret) {
  for (let i = 0; i < 3; i++) {
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

      await new Promise(r => setTimeout(r, 1500));

    } catch (e) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return null;
}

// ========================================
// 🚀 MAIN HANDLER
// ========================================
exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "ok" };
  }

  try {
    const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
    const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

    const rawBody = event.body;

    await logDebug("STEP_1_RECEIVED", rawBody);

    // ========================================
    // 🔐 SIGNATURE VERIFY
    // ========================================
    const signature = event.headers["paymongo-signature"];

    if (WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      if (!signature.includes(expectedSignature)) {
        await logDebug("ERROR_INVALID_SIGNATURE", { signature, expectedSignature });
        return { statusCode: 400 };
      }
    }

    await logDebug("STEP_2_SIGNATURE_OK", signature);

    const body = JSON.parse(rawBody);
    const data = body.data;

    if (!data) {
      await logDebug("ERROR_NO_DATA", body);
      return { statusCode: 200 };
    }

    const eventType = data.attributes.type;

    await logDebug("STEP_3_EVENT_TYPE", eventType);

    // ========================================
    // 🔥 HANDLE EVENTS
    // ========================================
    if (eventType !== "payment.paid" && eventType !== "source.chargeable") {
      await logDebug("IGNORED_EVENT", eventType);
      return { statusCode: 200 };
    }

    // ========================================
    // 🔥 GET PAYMENT ID (SAFE)
    // ========================================
    const paymentId =
      data.attributes?.data?.id ||
      data.attributes?.payment_id ||
      data.id;

    if (!paymentId) {
      await logDebug("ERROR_NO_PAYMENT_ID", data);
      return { statusCode: 200 };
    }

    await logDebug("STEP_4_PAYMENT_ID", paymentId);

    // ========================================
    // 🔥 VERIFY FROM PAYMONGO
    // ========================================
    const verifyData = await verifyPayment(paymentId, PAYMONGO_SECRET);

    await logDebug("STEP_5_VERIFY_RESPONSE", verifyData);

    if (!verifyData) {
      await logDebug("ERROR_VERIFY_FAILED", paymentId);
      return { statusCode: 200 };
    }

    const attributes = verifyData.data.attributes;

    const reference =
      attributes.remarks ||
      attributes.metadata?.reference;

    const amount = attributes.amount / 100;

    await logDebug("STEP_6_PAYMENT_DATA", { reference, amount });

    if (!reference) {
      await logDebug("ERROR_NO_REFERENCE", attributes);
      return { statusCode: 200 };
    }

    // ========================================
    // 🔎 FETCH TRANSACTION
    // ========================================
    const snap = await db.ref("transactions/" + reference).once("value");

    if (!snap.exists()) {
      await logDebug("ERROR_TRANSACTION_NOT_FOUND", reference);
      return { statusCode: 200 };
    }

    const trx = snap.val();

    await logDebug("STEP_7_TRANSACTION_FOUND", trx);

    // ========================================
    // 🔒 VALIDATION
    // ========================================
    if (Number(trx.amount) !== Number(amount)) {
      await logDebug("ERROR_AMOUNT_MISMATCH", {
        expected: trx.amount,
        actual: amount
      });
      return { statusCode: 200 };
    }

    if (trx.status === "COMPLETED") {
      await logDebug("ALREADY_PROCESSED", reference);
      return { statusCode: 200 };
    }

    // ========================================
    // ✅ COMPLETE TRANSACTION
    // ========================================
    await db.ref("transactions/" + reference).update({
      status: "COMPLETED",
      paidAt: Date.now(),
      paymentId
    });

    await logDebug("STEP_8_MARK_COMPLETED", reference);

    // ========================================
    // 💰 WALLET + INVESTMENT
    // ========================================
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

    await logDebug("STEP_9_WALLET_UPDATED", {
      userId: trx.userId,
      amount
    });

    // ========================================
    // 🎯 REFERRAL SYSTEM
    // ========================================
    await handleReferral(trx.userId, amount);

    await logDebug("STEP_10_REFERRAL_DONE", trx.userId);

    return {
      statusCode: 200,
      body: "SUCCESS"
    };

  } catch (err) {

    await logDebug("FATAL_ERROR", err.message);

    return {
      statusCode: 500,
      body: "ERROR"
    };
  }
};

// ========================================
// 💸 REFERRAL SYSTEM
// ========================================
async function handleReferral(userId, amount) {
  try {
    const userSnap = await db.ref("users/" + userId).once("value");
    const user = userSnap.val();

    if (!user || !user.referrer) return;

    const lvl1 = user.referrer;
    const lvl1Commission = amount * 0.15;

    await db.ref("users/" + lvl1).transaction(u => {
      if (!u) return u;
      u.wallet = (u.wallet || 0) + lvl1Commission;
      return u;
    });

    const lvl1Snap = await db.ref("users/" + lvl1).once("value");
    const lvl1Data = lvl1Snap.val();

    if (lvl1Data?.referrer) {
      const lvl2 = lvl1Data.referrer;
      const lvl2Commission = amount * 0.05;

      await db.ref("users/" + lvl2).transaction(u => {
        if (!u) return u;
        u.wallet = (u.wallet || 0) + lvl2Commission;
        return u;
      });

      const lvl2Snap = await db.ref("users/" + lvl2).once("value");
      const lvl2Data = lvl2Snap.val();

      if (lvl2Data?.referrer) {
        const lvl3 = lvl2Data.referrer;
        const lvl3Commission = amount * 0.02;

        await db.ref("users/" + lvl3).transaction(u => {
          if (!u) return u;
          u.wallet = (u.wallet || 0) + lvl3Commission;
          return u;
        });
      }
    }

  } catch (err) {
    await logDebug("REFERRAL_ERROR", err.message);
  }
}