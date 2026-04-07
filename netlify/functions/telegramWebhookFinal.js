exports.handler = async (event) => {
  const https = require("https");
  const fetch = require("node-fetch");

  // 🔐 ENV VARIABLES ONLY (NO HARDCODED)
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_CHAT_ID;

  // ❗ HARD STOP kung wala env (para safe)
  if (!TOKEN || !ADMIN_ID) {
    return {
      statusCode: 500,
      body: "Missing environment variables"
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message;

    if (!message) {
      return { statusCode: 200, body: "No message" };
    }

    const chatId = String(message.chat.id);
    const rawText = message.text || "";

    // =========================
    // 🔥 RATE LIMIT
    // =========================
    global.userCooldown = global.userCooldown || {};
    const now = Date.now();

    if (global.userCooldown[chatId] && now - global.userCooldown[chatId] < 2000) {
      return { statusCode: 200, body: "Slow down" };
    }

    global.userCooldown[chatId] = now;

    const text = rawText.toLowerCase().trim();
    const isAdmin = chatId === String(ADMIN_ID);

    let reply = "";

    // =========================
    // 🟡 WELCOME MESSAGE
    // =========================
    const welcomeMessage = `👋 Welcome to ClickCoin 💰

📌 HOW IT WORKS:

1. 💳 DEPOSIT
- Type: deposit
- Download QR code
- Open GCash
- Scan / Upload QR
- Pay exact amount

2. 💰 EARNINGS (COMMISSION)
- Based on tasks

3. 📤 WITHDRAW
- withdraw amount gcashNumber
- Min ₱150

4. 📊 ACCOUNT
- balance
- account

📋 TYPE: menu`;

    // =========================
    // 📋 COMMANDS
    // =========================
    const commands = {

      "/start": async () => welcomeMessage,

      "menu": async () => `📋 MENU

deposit
balance
withdraw
account
support
lookup 09123456789`,

      "help": async () => welcomeMessage,

      "support": async () => "📩 Support will reply soon.",

      "account": async () => `🆔 ID: ${chatId}`,

      "withdraw": async () => `Format:
withdraw 100 09123456789`,

      // =========================
      // 💳 DEPOSIT
      // =========================
      "deposit": async () => {
        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/createPayment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: 100,
              userId: chatId
            })
          });

          const data = await res.json();

          if (!data.checkout_url) return "❌ Payment error";

          return `💳 PAY HERE:
${data.checkout_url}`;

        } catch {
          return "❌ Payment failed";
        }
      },

      // =========================
      // 💰 BALANCE
      // =========================
      "balance": async () => {
        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/getBalance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: chatId })
          });

          const data = await res.json();
          return `💰 ₱${data.balance}`;

        } catch {
          return "❌ Balance error";
        }
      },

      "lookup": async () => `Format:
lookup 09123456789`,

      "admin": async () => {
        if (!isAdmin) return "❌ Denied";
        return `approve id
reject id
stats`;
      },

      "stats": async () => {
        if (!isAdmin) return "❌ Admin only";

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/adminStats");
          const data = await res.json();

          return `Users: ${data.totalUsers}`;

        } catch {
          return "❌ Stats error";
        }
      }
    };

    // =========================
    // 🔍 LOOKUP
    // =========================
    if (text.startsWith("lookup ")) {

      const mobile = text.split(" ")[1];

      try {
        const res = await fetch("https://clickcoin.site/.netlify/functions/getUserByMobile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile })
        });

        const data = await res.json();

        reply = data.error
          ? "❌ Not found"
          : `📱 ${data.mobile}
💰 ₱${data.balance}`;

      } catch {
        reply = "❌ Lookup error";
      }
    }

    // =========================
    // 💸 WITHDRAW
    // =========================
    else if (text.startsWith("withdraw ")) {

      const parts = text.split(" ");

      if (parts.length !== 3) {
        reply = "❌ Format error";
      } else {
        const amount = parseFloat(parts[1]);
        const gcash = parts[2];

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/requestWithdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: chatId,
              amount,
              gcash
            })
          });

          const data = await res.json();
          reply = data.error ? "❌ " + data.error : "✅ Submitted";

        } catch {
          reply = "❌ Withdraw error";
        }
      }
    }

    // =========================
    // 🔐 ADMIN ACTIONS
    // =========================
    else if (text.startsWith("approve ") || text.startsWith("reject ")) {

      if (!isAdmin) {
        reply = "❌ Admin only";
      } else {
        const [action, withdrawId] = text.split(" ");

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/adminWithdrawAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              withdrawId,
              action
            })
          });

          const data = await res.json();
          reply = data.error ? "❌ " + data.error : `✅ ${action}`;

        } catch {
          reply = "❌ Admin error";
        }
      }
    }

    // =========================
    // 📋 COMMAND MATCH
    // =========================
    else if (commands[text]) {
      reply = await commands[text]();
    }

    else {
      reply = "❌ Unknown\nType menu";
    }

    // =========================
    // 📤 SEND TO TELEGRAM
    // =========================
    const postData = JSON.stringify({
      chat_id: chatId,
      text: reply
    });

    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.telegram.org",
        path: `/bot${TOKEN}/sendMessage`,
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, (res) => {
        res.on("data", () => {});
        res.on("end", resolve);
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
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};