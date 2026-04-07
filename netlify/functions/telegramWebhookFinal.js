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

    // 🔥 RATE LIMIT (FIXED POSITION)
    global.userCooldown = global.userCooldown || {};
    const now = Date.now();

    if (global.userCooldown[chatId] && now - global.userCooldown[chatId] < 2000) {
      return {
        statusCode: 200,
        body: "Slow down"
      };
    }

    global.userCooldown[chatId] = now;

    const text = rawText.toLowerCase().replace(/\s+/g, " ").trim();
    const isAdmin = chatId === ADMIN_ID;

    console.log("👉 TEXT:", text);
    console.log("👉 ADMIN:", isAdmin);

    let reply = "";

    // =========================
    // 🔥 COMMANDS
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
withdraw
support`;
      },

      "help": async () => "📩 Support will reply soon.",

      "support": async () => "📩 Support will reply soon.",

      "account": async () => {
        return `🆔 Your account ID:
${chatId}`;
      },

      // 💰 USER WITHDRAW INFO
      "withdraw": async () => {
        return `💸 Withdraw format:

withdraw 100 09123456789`;
      },

      // 🔐 ADMIN COMMANDS
      "approve": async () => {
        if (!isAdmin) return "❌ Admin only.";
        return `✅ Approve format:

approve withdrawId`;
      },

      "reject": async () => {
        if (!isAdmin) return "❌ Admin only.";
        return `❌ Reject format:

reject withdrawId`;
      },

      "stats": async () => {
        if (!isAdmin) return "❌ Admin only.";

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/adminStats");
          const data = await res.json();

          return `📊 SYSTEM STATS

👥 Users: ${data.totalUsers}
💰 Deposits: ${data.totalDeposits}
📤 Withdraws: ${data.totalWithdraws}
⏳ Pending: ${data.pendingWithdraws}`;

        } catch {
          return "❌ Failed to load stats";
        }
      },

      // 💳 DEPOSIT
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
          console.error(err);
          return "❌ Payment failed.";
        }
      },

      // 💰 BALANCE
      "balance": async () => {
        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/getBalance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              userId: chatId
            })
          });

          const data = await res.json();

          return `💰 Your balance: ₱${data.balance}`;

        } catch {
          return "❌ Failed to fetch balance.";
        }
      },

      "admin": async () => {
        if (!isAdmin) return "❌ Access denied.";

        return `🔐 ADMIN PANEL

approve
reject
stats`;
      }

    };

    // =========================
    // 🔥 PRIORITY PARSERS
    // =========================

    if (text.startsWith("withdraw ")) {
      const parts = text.split(" ");

      if (parts.length !== 3) {
        reply = "❌ Format: withdraw amount gcash";
      } else {
        const amount = parseFloat(parts[1]);
        const gcash = parts[2];

        if (isNaN(amount) || amount <= 0) {
          reply = "❌ Invalid amount";
        } else {
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
            reply = data.error ? "❌ " + data.error : "✅ Withdraw request submitted";

          } catch {
            reply = "❌ Withdraw failed";
          }
        }
      }

    } else if (text.startsWith("approve ")) {
      if (!isAdmin) {
        reply = "❌ Admin only.";
      } else {
        const withdrawId = text.split(" ")[1];

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/adminWithdrawAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              withdrawId,
              action: "approve"
            })
          });

          const data = await res.json();
          reply = data.error ? "❌ " + data.error : "✅ Withdraw approved";

        } catch {
          reply = "❌ Error approving";
        }
      }

    } else if (text.startsWith("reject ")) {
      if (!isAdmin) {
        reply = "❌ Admin only.";
      } else {
        const withdrawId = text.split(" ")[1];

        try {
          const res = await fetch("https://clickcoin.site/.netlify/functions/adminWithdrawAction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              withdrawId,
              action: "reject"
            })
          });

          const data = await res.json();
          reply = data.error ? "❌ " + data.error : "❌ Withdraw rejected";

        } catch {
          reply = "❌ Error rejecting";
        }
      }

    } else if (commands[text]) {
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
    console.error("❌ ERROR:", err);

    return {
      statusCode: 500,
      body: err.message
    };
  }
};