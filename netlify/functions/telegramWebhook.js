exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    console.log("Telegram update:", body);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Webhook received"
      }),
    };
  } catch (err) {
    console.error("Error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      }),
    };
  }
};