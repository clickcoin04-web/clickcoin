exports.handler = async (event) => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const chatId = body.message?.chat?.id;
    const text = body.message?.text;

    if (!chatId) {
      return {
        statusCode: 200,
        body: "No chat ID"
      };
    }

    const ADMIN_ID = 2080584414;

    let reply = "❓ Unknown command";

    if (text === "/start") {
      reply = "👋 Welcome to ClickCoin!";
    } else if (text === "hello") {
      reply = "👋 Hello!";
    } else if (text === "admin") {
      reply = chatId == ADMIN_ID
        ? "🔐 Admin panel"
        : "❌ You are not admin";
    }

    // ✅ NO node-fetch
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply
      })
    });

    const data = await res.json();
    console.log("📤 Telegram response:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    console.error("❌ ERROR:", err);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};