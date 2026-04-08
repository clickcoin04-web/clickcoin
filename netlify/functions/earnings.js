const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async () => {
  const usersSnap = await db.ref("investments").once("value");
  const users = usersSnap.val();

  if (!users) {
    return { statusCode: 200, body: "No users" };
  }

  const now = Date.now();

  for (const uid in users) {
    const userTasks = users[uid];

    for (const taskId in userTasks) {
      const task = userTasks[taskId];

      const last = task.lastClaim || 0;

      // ⏱ EVERY 1 MINUTE
      if (now - last >= 60000) {

        const daily = task.dailyIncome || (task.capital * 0.1);
        const perMinute = daily / 1440;

        const newEarned = (task.totalEarned || 0) + perMinute;

        // 🔥 UPDATE TASK
        await db.ref(`investments/${uid}/${taskId}`).update({
          totalEarned: newEarned,
          lastClaim: now
        });

        // 🔥 UPDATE WALLET
        await db.ref(`users/${uid}`).transaction(user => {
          if (!user) return user;
          user.wallet = (user.wallet || 0) + perMinute;
          user.totalEarnings = (user.totalEarnings || 0) + perMinute;
          return user;
        });
      }
    }
  }

  return {
    statusCode: 200,
    body: "Earnings updated"
  };
};