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

    await db.ref("daily_logs/" + id).set({
      step,
      data,
      time: new Date().toISOString()
    });

  } catch (e) {
    console.error("LOG ERROR:", e.message);
  }
}

// ==========================
// 🚀 MAIN FUNCTION
// ==========================
exports.handler = async () => {

  const startTime = Date.now();

  try {

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ==========================
    // 🔒 GLOBAL LOCK (ANTI DOUBLE RUN)
    // ==========================
    const lockRef = db.ref("system/daily_lock/" + today);

    const lockSnap = await lockRef.once("value");

    if (lockSnap.exists()) {
      await log("ALREADY_RAN_TODAY", today);
      return {
        statusCode: 200,
        body: "ALREADY RAN TODAY"
      };
    }

    // SET LOCK
    await lockRef.set({
      time: Date.now()
    });

    await log("START_DAILY_RUN", today);

    const snap = await db.ref("users").once("value");

    if (!snap.exists()) {
      await log("NO_USERS_FOUND", null);
      return { statusCode: 200, body: "NO USERS" };
    }

    const now = Date.now();

    let processedUsers = 0;
    let skippedUsers = 0;
    let successUsers = 0;

    let updates = [];

    snap.forEach(userSnap => {

      const uid = userSnap.key;
      const user = userSnap.val();

      processedUsers++;

      if (!user.investment) {
        skippedUsers++;
        return;
      }

      const inv = user.investment;

      // ❌ 30 days limit
      if (inv.days >= 30) {
        skippedUsers++;
        return;
      }

      // ==========================
      // 🔒 PER USER DAILY LOCK
      // ==========================
      const userDayRef = db.ref(`earnings_logs/${uid}/${today}`);

      updates.push(
        userDayRef.transaction(current => {

          if (current) {
            // already paid today
            return;
          }

          return {
            paid: true,
            time: now
          };

        }).then(async (res) => {

          if (!res.committed) {
            skippedUsers++;
            return;
          }

          const income = inv.capital * 0.10;

          // ==========================
          // 💰 SAFE WALLET UPDATE
          // ==========================
          await db.ref("users/" + uid).transaction(u => {

            if (!u || !u.investment) return u;

            u.wallet = (u.wallet || 0) + income;

            u.investment.lastClaim = now;
            u.investment.days = (u.investment.days || 0) + 1;

            return u;
          });

          successUsers++;

          await log("USER_INCOME_ADDED", {
            uid,
            income,
            capital: inv.capital
          });

        })
      );

    });

    await Promise.all(updates);

    const duration = Date.now() - startTime;

    await log("DAILY_RUN_COMPLETE", {
      processedUsers,
      successUsers,
      skippedUsers,
      duration_ms: duration
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "DAILY INCOME SUCCESS",
        processedUsers,
        successUsers,
        skippedUsers,
        duration
      })
    };

  } catch (err) {

    await log("FATAL_ERROR", err.message);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};

// ==========================
// ⏰ CRON
// ==========================
exports.config = {
  schedule: "0 16 * * *" // 12AM PH
};