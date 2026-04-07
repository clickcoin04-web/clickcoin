const { getDB } = require("./_db");

exports.handler = async (event) => {
  try {
    const ADMIN_KEY = process.env.ADMIN_API_KEY;

    // 🔒 ADMIN AUTH (CRITICAL)
    const headers = event.headers || {};
    const providedKey = headers["x-admin-key"];

    if (!ADMIN_KEY || providedKey !== ADMIN_KEY) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    const db = await getDB();

    console.log("📊 Fetching admin stats...");

    // 🔥 PARALLEL QUERIES (FASTER)
    const [
      totalUsers,
      totalDeposits,
      totalWithdraws,
      pendingWithdraws
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("transactions").countDocuments({
        type: "deposit",
        status: "completed" // ✅ FIXED
      }),
      db.collection("withdraws").countDocuments(),
      db.collection("withdraws").countDocuments({ status: "pending" })
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        totalUsers,
        totalDeposits,
        totalWithdraws,
        pendingWithdraws
      })
    };

  } catch (err) {
    console.error("❌ adminStats error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal error"
      })
    };
  }
};