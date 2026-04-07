exports.handler = async (event) => {
  const admin = require("firebase-admin");

  // =========================
  // 🔥 INIT FIREBASE (SAFE INIT)
  // =========================
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.FB_DATABASE_URL
    });
  }

  const db = admin.database();

  try {
    const body = JSON.parse(event.body || "{}");
    let mobile = (body.mobile || "").trim();

    // =========================
    // 🔧 CLEAN MOBILE FORMAT
    // =========================
    mobile = mobile.replace(/\s+/g, "");

    if (!mobile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Mobile required" })
      };
    }

    // normalize (optional)
    if (mobile.startsWith("+63")) {
      mobile = "0" + mobile.slice(3);
    }

    // =========================
    // 🔍 SEARCH USER
    // =========================
    const snapshot = await db.ref("users")
      .orderByChild("mobile")
      .equalTo(mobile)
      .once("value");

    if (!snapshot.exists()) {
      return {
        statusCode: 200,
        body: JSON.stringify({ error: "User not found" })
      };
    }

    let userData = null;

    snapshot.forEach(child => {
      const data = child.val();

      userData = {
        uid: child.key,
        username: data.username || "",
        mobile: data.mobile || mobile,
        balance: data.balance || 0,
        totalDeposit: data.totalDeposit || 0,
        createdAt: data.createdAt || null
      };
    });

    // =========================
    // 📊 COMPUTE EARNINGS
    // =========================
    userData.earnings = userData.balance - userData.totalDeposit;

    // =========================
    // ✅ RESPONSE
    // =========================
    return {
      statusCode: 200,
      body: JSON.stringify(userData)
    };

  } catch (err) {
    console.error("❌ ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        details: err.message
      })
    };
  }
};