exports.handler = async (event) => {
  const https = require("https");

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = "2080584414"; // palitan kung kailangan

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const chatId = body.message?.chat?.id?.toString();
    let rawText = body.message?.text || "";

    if (!chatId) {
      return {
        statusCode: 200,
        body: "No chat ID"
      };
    }

    // 🔥 CLEAN TEXT (SUPER SAFE)
    let text = rawText
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    console.log("👉 RAW TEXT:", JSON.stringify(rawText));
    console.log("👉 CLEAN TEXT:", text);

    const isAdmin = chatId === ADMIN_ID;

    console.log("👉 CHAT ID:", chatId);
    console.log("👉 IS ADMIN:", isAdmin);

    let reply = "";

    // 🌐 PUBLIC COMMANDS
    if (text === "/start") {
      reply =
`👋 Welcome to ClickCoin!

Commands:
menu - open menu
help - support
admin - admin panel`;
    }

    else if (text.includes("menu")) {
      reply =
`📋 Main Menu:

1. account
2. balance
3. support`;
    }

    else if (text.includes("help") || text.includes("support")) {
      reply = "📩 Support will reply soon.";
    }

    else if (text.includes("account")) {
      reply = `🆔 Your account ID: ${chatId}`;
    }

    else if (text === "balance") {
      reply = "💰 Your balance: (connect later)";
    }

    // 🔐 ADMIN PANEL
    else if (text.includes("admin")) {
      if (isAdmin) {
        reply =
`🔐 ADMIN PANEL

users - view users
balance_admin - system balance
withdraw - pending withdrawals`;
      } else {
        reply = "❌ Access denied.";
      }
    }

    // 🔐 ADMIN COMMANDS
    else if (text === "users" && isAdmin) {
      reply = "👥 Total users: (connect database)";
    }

    else if (text === "balance_admin" && isAdmin) {
      reply = "💰 System balance: (connect PayMongo)";
    }

    else if (text === "withdraw" && isAdmin) {
      reply = "📤 Pending withdrawals: (connect DB)";
    }

    // ❗ FALLBACK
    else {
      reply =
`❌ Unknown command

Type:
menu - show options
help - support`;
    }

    console.log("👉 FINAL REPLY:", reply);

    // 📤 SEND MESSAGE TO TELEGRAM
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
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          console.log("📤 Telegram response:", data);
          resolve();
        });
      });

      req.on("error", (err) => {
        console.error("❌ REQUEST ERROR:", err);
        reject(err);
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