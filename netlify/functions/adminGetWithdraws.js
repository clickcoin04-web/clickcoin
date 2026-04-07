const { getDB } = require("./_db");

exports.handler = async (event) => {
  const ADMIN_KEY = process.env.ADMIN_API_KEY;

  if (event.headers["x-admin-key"] !== ADMIN_KEY) {
    return { statusCode: 403 };
  }

  const db = await getDB();

  const withdraws = await db.collection("withdraws")
    .find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return {
    statusCode: 200,
    body: JSON.stringify({ withdraws })
  };
};