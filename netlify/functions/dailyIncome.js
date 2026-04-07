const admin = require("firebase-admin");

// 🔥 INIT FIREBASE
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    console.log("🚀 DAILY INCOME RUN:", today);

    const snap = await db.ref("users").once("value");

    if (!snap.exists()) {
      return { statusCode: 200, body: "No users" };
    }

    const users = snap.val();

    for (const uid in users) {
      const user = users[uid];

      // ❌ skip kung walang investment
      if (!user.investment || user.investment <= 0) continue;

      // ❌ skip kung nakapag-claim na today
      if (user.lastIncomeDate === today) continue;

      const income = user.investment * 0.10;

      // 💰 ADD WALLET
      await db.ref("users/" + uid).transaction(u => {
        if (!u) return u;

        u.wallet = (u.wallet || 0) + income;
        u.lastIncomeDate = today;

        return u;
      });

      // 📜 LOG
      await db.ref("income_logs").push({
        uid,
        income,
        date: today,
        timestamp: Date.now()
      });

      console.log(`✅ ${uid} +${income}`);
    }

    return {
      statusCode: 200,
      body: "DAILY INCOME SUCCESS"
    };

  } catch (err) {
    console.error("❌ DAILY ERROR:", err);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};