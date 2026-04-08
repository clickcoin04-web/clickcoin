const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN)),
    databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.database();

exports.handler = async (event) => {
  try {
    const ref = event.queryStringParameters.ref;

    if (!ref) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing reference" })
      };
    }

    const snap = await db.ref("transactions/" + ref).once("value");

    if (!snap.exists()) {
      return {
        statusCode: 404,
        body: JSON.stringify({ status: "NOT_FOUND" })
      };
    }

    const data = snap.val();

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: data.status || "PENDING"
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};