exports.handler = async (event) => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const chatId = body.message?.chat?.id;
    const text = body.message?.text;

    if (!chatId) {
      console.log("❌ Walang chatId");
      return {
        statusCode: 200,
        body: "No chat ID"
      };
    }

    let reply = "❓ Unknown command";

    if (text === "/start") {
      reply = "👋 Welcome to ClickCoin!";
    } else if (text === "hello") {
      reply = "👋 Hello!";
    }

    console.log("👉 Sending reply to:", chatId);
    console.log("👉 Message:", reply);

    const https = require("https");

    const data = JSON.stringify({
      chat_id: chatId,
      text: reply
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          console.log("📤 Telegram response:", body);
          resolve();
        });
      });

      req.on("error", (e) => {
        console.error("❌ REQUEST ERROR:", e);
        reject(e);
      });

      req.write(data);
      req.end();
    });

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