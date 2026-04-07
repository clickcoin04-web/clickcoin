exports.handler = async (event) => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = 2080584414;

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

    let reply = "Unknown command";

    // 🔐 ADMIN CHECK
    const isAdmin = chatId == ADMIN_ID;

    if (text === "/start") {
      reply = "Welcome to ClickCoin!";
    } 
    else if (text === "hello") {
      reply = "Hello!";
    } 
    else if (text === "admin") {
      if (isAdmin) {
        reply =
`🔐 ADMIN PANEL

Commands:
users - view users
balance - check system
withdraw - pending withdrawals`;
      } else {
        reply = "Access denied.";
      }
    }

    // 👥 SAMPLE COMMANDS
    else if (text === "users" && isAdmin) {
      reply = "👥 Total users: (connect mo sa database later)";
    }
    else if (text === "balance" && isAdmin) {
      reply = "💰 System balance: (connect PayMongo later)";
    }
    else if (text === "withdraw" && isAdmin) {
      reply = "📤 Pending withdrawals: (connect DB later)";
    }

    const https = require("https");

    const postData = JSON.stringify({
      chat_id: chatId,
      text: reply
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          console.log("📤 Telegram response:", responseData);
          resolve();
        });
      });

      req.on("error", (e) => {
        console.error("❌ REQUEST ERROR:", e);
        reject(e);
      });

      req.write(postData);
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