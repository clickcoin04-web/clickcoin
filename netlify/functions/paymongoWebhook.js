const crypto = require("crypto");
const fetch = require("node-fetch");
const { completeTransaction } = require("./_transactions");

exports.handler = async (event) => {
  try {
    const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;
    const WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET;

    const rawBody = event.body;

    // 🔒 SIGNATURE VERIFICATION (CRITICAL)
    const signature = event.headers["paymongo-signature"];

    if (!signature || !WEBHOOK_SECRET) {
      return { statusCode: 400, body: "Missing signature" };
    }

    const computedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!signature.includes(computedSignature)) {
      console.error("❌ Invalid webhook signature");
      return { statusCode: 403, body: "Invalid signature" };
    }

    const body = JSON.parse(rawBody);

    const type = body?.data?.attributes?.type;

    if (type !== "link.payment.paid") {
      return { statusCode: 200, body: "Ignored" };
    }

    const attributes = body.data.attributes.data.attributes;

    const reference = attributes.remarks;
    const paymentId = body.data.id;

    if (!reference || !paymentId) {
      return {
        statusCode: 400,
        body: "Missing reference or paymentId"
      };
    }

    console.log("💰 Webhook received:", { reference, paymentId });

    // 🔒 DOUBLE VERIFY WITH PAYMONGO
    const res = await fetch(`https://api.paymongo.com/v1/links/${attributes.id}`, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64")
      }
    });

    const verifyData = await res.json();

    if (!verifyData.data) {
      console.error("❌ PayMongo verify failed");
      return { statusCode: 400, body: "Verification failed" };
    }

    const paid = verifyData.data.attributes.status === "paid";

    if (!paid) {
      return { statusCode: 200, body: "Not paid" };
    }

    // 🔥 SAFE CREDIT (your logic, now protected)
    await completeTransaction(reference);

    return {
      statusCode: 200,
      body: "OK"
    };

  } catch (err) {
    console.error("❌ webhook error:", err);

    return {
      statusCode: 500,
      body: err.message || "Webhook error"
    };
  }
};