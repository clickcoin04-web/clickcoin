exports.handler = async (event) => {
  const https = require("https");
  const fetch = require("node-fetch");

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_CHAT_ID;

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("📩 Telegram update:", JSON.stringify(body));

    const message = body.message;
    if (!message) {
      return { statusCode: 200, body: "No message" };
    }

    const chatId = message.chat.id.toString();
    const rawText = message.text || "";

    // 🔥 CLEAN TEXT
    const text = rawText
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    const isAdmin = chatId === ADMIN_ID;

    console.log("👉 TEXT:", text);
    console.log("👉 ADMIN:", isAdmin);

    let reply = "";

    // =========================
    // 🔥 COMMANDS (FULL SYSTEM)
    // =========================

    const commands = {

      "/start": async () => {
        return `👋 Welcome to ClickCoin 💰

Commands:
menu
deposit
balance
help`;
      },

      "menu": async () => {
        return `📋 Main Menu:

account
balance
deposit
support`;
      },

      "help": async () => {
        return "📩 Support will reply soon.";
      },

      "support": async () => {
        return "📩 Support will reply soon.";
      },

      "account": async () => {
        return `🆔 Your account ID:
${chatId}`;
      },

      // =========================
      // 💰 PAYMONGO DEPOSIT
      // =========================
      "deposit": async () => {
        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/createPayment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              amount: 100,
              userId: chatId
            })
          });

          const data = await res.json();

          if (!data.checkout_url) {
            return "❌ Payment error. Try again.";
          }

          return `💳 Deposit here:
${data.checkout_url}`;

        } catch (err) {
          console.error("❌ PayMongo error:", err);
          return "❌ Payment failed.";
        }
      },

      // =========================
      // 💰 BALANCE (READY FOR DB)
      // =========================
      "balance": async () => {
        return "💰 Your balance: 0 (connect DB)";
      },

      // =========================
      // 🔐 ADMIN PANEL
      // =========================
      "admin": async () => {
        if (!isAdmin) return "❌ Access denied.";

        return `🔐 ADMIN PANEL

users
balance_admin
withdraw`;
      },

      "users": async () => {
        if (!isAdmin) return "❌ Admin only.";
        return "👥 Total users: (connect database)";
      },

      "balance_admin": async () => {
        if (!isAdmin) return "❌ Admin only.";
        return "💰 System balance: (connect PayMongo)";
      },

      "withdraw": async () => {
        if (!isAdmin) return "❌ Admin only.";
        return "📤 Pending withdrawals: (connect DB)";
      }

    };

    // =========================
    // 🚀 EXECUTE COMMAND
    // =========================

    if (commands[text]) {
      reply = await commands[text]();
    } else {
      reply = `❌ Unknown command

Type:
menu
help`;
    }

    console.log("👉 REPLY:", reply);

    // =========================
    // 📤 SEND MESSAGE
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

        res.on("data", chunk => data += chunk);

        res.on("end", () => {
          console.log("📤 Telegram:", data);
          resolve();
        });
      });

      req.on("error", reject);
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