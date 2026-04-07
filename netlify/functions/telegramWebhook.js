exports.handler = async (event) => {
  const https = require("https");

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = "2080584414"; // palitan kung kailangan

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const chatId = body.message?.chat?.id?.toString();
    const rawText = body.message?.text || "";

    if (!chatId) {
      return {
        statusCode: 200,
        body: "No chat ID"
      };
    }

    // 🔥 CLEAN TEXT (FINAL)
    const text = rawText
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const isAdmin = chatId === ADMIN_ID;

    console.log("👉 RAW:", JSON.stringify(rawText));
    console.log("👉 CLEAN:", text);
    console.log("👉 ADMIN:", isAdmin);

    let reply = "";

    // =========================
    // ✅ PRIORITY (EXACT MATCH)
    // =========================

    if (text === "/start") {
      reply =
`👋 Welcome to ClickCoin!

Commands:
menu - open menu
help - support
admin - admin panel`;
    }

    else if (text === "admin") {
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

    else if (text === "users") {
      if (isAdmin) {
        reply = "👥 Total users: (connect database)";
      } else {
        reply = "❌ Admin only.";
      }
    }

    else if (text === "balance_admin") {
      if (isAdmin) {
        reply = "💰 System balance: (connect PayMongo)";
      } else {
        reply = "❌ Admin only.";
      }
    }

    else if (text === "withdraw") {
      if (isAdmin) {
        reply = "📤 Pending withdrawals: (connect DB)";
      } else {
        reply = "❌ Admin only.";
      }
    }

    else if (text === "menu") {
      reply =
`📋 Main Menu:

account
balance
support`;
    }

    else if (text === "account") {
      reply = `🆔 Your account ID: ${chatId}`;
    }

    else if (text === "balance") {
      reply = "💰 Your balance: (connect later)";
    }

    else if (text === "help" || text === "support") {
      reply = "📩 Support will reply soon.";
    }

    // =========================
    // ❗ FALLBACK
    // =========================

    else {
      reply =
`❌ Unknown command

Type:
menu
help`;
    }

    console.log("👉 FINAL REPLY:", reply);

    // =========================
    // 📤 SEND TO TELEGRAM
    // =========================

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