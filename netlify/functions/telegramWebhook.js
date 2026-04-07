exports.handler = async (event) => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = "2080584414"; // string para safe compare

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const chatId = body.message?.chat?.id?.toString();
    let text = body.message?.text || "";

    if (!chatId) {
      return {
        statusCode: 200,
        body: "No chat ID"
      };
    }

    // 🔥 FIX: normalize text (IMPORTANT)
    text = text.trim().toLowerCase();

    console.log("👉 TEXT RECEIVED:", text);

    const isAdmin = chatId === ADMIN_ID;

    let reply = "";

    // 🌐 PUBLIC COMMANDS (LAHAT MAY ACCESS)
    if (text === "/start") {
      reply =
`Welcome to ClickCoin!

Commands:
menu - open menu
help - support
admin - admin panel`;
    }

    else if (text === "menu") {
      reply =
`Main Menu:

1. account
2. balance
3. support`;
    }

    else if (text === "help" || text === "support") {
      reply = "Support will reply soon.";
    }

    else if (text === "account") {
      reply = `Your account ID: ${chatId}`;
    }

    else if (text === "balance") {
      reply = "Your balance: (connect later)";
    }

    // 🔐 ADMIN PANEL
    else if (text === "admin") {
      if (isAdmin) {
        reply =
`ADMIN PANEL

users - view users
balance_admin - system balance
withdraw - pending withdrawals`;
      } else {
        reply = "Access denied.";
      }
    }

    // 🔐 ADMIN COMMANDS
    else if (text === "users" && isAdmin) {
      reply = "Total users: (connect database)";
    }

    else if (text === "balance_admin" && isAdmin) {
      reply = "System balance: (connect PayMongo)";
    }

    else if (text === "withdraw" && isAdmin) {
      reply = "Pending withdrawals: (connect DB)";
    }

    // ❗ FALLBACK (HINDI NA BLANK)
    else {
      reply =
`Unknown command.

Type:
menu - show options
help - support`;
    }

    console.log("FINAL REPLY:", reply);

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