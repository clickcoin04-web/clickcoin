const admin = require("firebase-admin");

// 🔥 INIT FIREBASE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

// 🔥 LOGGER (REALTIME DEBUG)
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

// ========================================
// 🚀 MAIN FUNCTION
// ========================================
exports.handler = async () => {

  const startTime = Date.now();

  try {

    await log("START_DAILY_RUN", "Triggered");

    const snap = await db.ref("users").once("value");

    if (!snap.exists()) {
      await log("NO_USERS_FOUND", null);
      return {
        statusCode: 200,
        body: "NO USERS"
      };
    }

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    let processedUsers = 0;
    let skippedUsers = 0;
    let successUsers = 0;

    let updates = [];

    snap.forEach(userSnap => {

      const uid = userSnap.key;
      const user = userSnap.val();

      processedUsers++;

      // ❌ NO INVESTMENT
      if (!user.investment) {
        skippedUsers++;
        return;
      }

      const inv = user.investment;

      // ❌ LIMIT 30 DAYS
      if (inv.days >= 30) {
        skippedUsers++;
        return;
      }

      const last = inv.lastClaim || inv.start || now;

      // ❌ NOT YET 24 HOURS
      if (now - last < ONE_DAY) {
        skippedUsers++;
        return;
      }

      const income = inv.capital * 0.10;

      // 🔥 APPLY TRANSACTION
      updates.push(
        db.ref("users/" + uid).transaction(u => {
          if (!u) return u;

          if (!u.investment) return u;

          u.wallet = (u.wallet || 0) + income;

          u.investment.lastClaim = now;
          u.investment.days = (u.investment.days || 0) + 1;

          return u;
        }).then(() => {
          successUsers++;

          return log("USER_INCOME_ADDED", {
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

// ========================================
// ⏰ NETLIFY CRON (AUTO RUN DAILY)
// ========================================
exports.config = {
  schedule: "0 16 * * *" 
  // 🔥 12AM PH TIME (UTC-8 difference)
};