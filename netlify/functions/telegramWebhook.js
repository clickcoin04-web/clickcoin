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
    // ✅ COMMAND HANDLER (FINAL FIX)
    // =========================

    const commands = {
      "/start": () => `👋 Welcome to ClickCoin!

Commands:
menu
help
admin`,

      "menu": () => `📋 Main Menu:

account
balance
support`,

      "help": () => "📩 Support will reply soon.",
      "support": () => "📩 Support will reply soon.",

      "account": () => `🆔 Your account ID: ${chatId}`,

      "balance": () => "💰 Your balance: (connect later)",

      "admin": () => {
        if (!isAdmin) return "❌ Access denied.";
        return `🔐 ADMIN PANEL

users
balance_admin
withdraw`;
      },

      "users": () => {
        if (!isAdmin) return "❌ Admin only.";
        return "👥 Total users: (connect database)";
      },

      "balance_admin": () => {
        if (!isAdmin) return "❌ Admin only.";
        return "💰 System balance: (connect PayMongo)";
      },

      "withdraw": () => {
        if (!isAdmin) return "❌ Admin only.";
        return "📤 Pending withdrawals: (connect DB)";
      }
    };

    // 👉 EXECUTE COMMAND
    if (commands[text]) {
      reply = commands[text]();
    } else {
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