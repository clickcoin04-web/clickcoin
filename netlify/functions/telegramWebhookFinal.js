exports.handler = async (event) => {
  const https = require("https");
  const fetch = require("node-fetch");

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_CHAT_ID;

  try {
    const body = JSON.parse(event.body || "{}");
    const message = body.message;

    if (!message) {
      return { statusCode: 200, body: "No message" };
    }

    const chatId = message.chat.id.toString();
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
    const isAdmin = chatId === ADMIN_ID;

    let reply = "";

    // =========================
    // 🟡 WELCOME MESSAGE (NEW)
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
- You earn based on tasks
- Commission depends on your level
- Profit = Withdrawable earnings

3. 📤 WITHDRAW
- Type: withdraw amount gcashNumber
- Min: ₱150
- Once per day only
- Admin approval required

4. 📊 CHECK ACCOUNT
- balance
- account

5. 📞 SUPPORT
- support

📋 TYPE: menu
to see all commands`;

    // =========================
    // 🔥 COMMANDS
    // =========================
    const commands = {

      "/start": async () => welcomeMessage,

      "menu": async () => {
        return `📋 MAIN MENU

💳 deposit
💰 balance
📤 withdraw
👤 account
📞 support

🔍 lookup 09123456789 (check user info)

ℹ help`;
      },

      "help": async () => welcomeMessage,

      "support": async () => "📩 Support will reply soon.",

      "account": async () => {
        return `🆔 ACCOUNT INFO

Your ID: ${chatId}

Use this for deposits & support.`;
      },

      // =========================
      // 💰 WITHDRAW GUIDE (IMPROVED)
      // =========================
      "withdraw": async () => {
        return `💸 WITHDRAW GUIDE

Format:
withdraw 100 09123456789

📌 Rules:
- Minimum ₱150
- Earnings only
- 1x per day
- Needs admin approval`;
      },

      // =========================
      // 💳 DEPOSIT (UPDATED GUIDE)
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

          if (!data.checkout_url) {
            return "❌ Payment error. Try again.";
          }

          return `💳 DEPOSIT INSTRUCTIONS

1. Click link below
2. Download QR
3. Open GCash
4. Upload QR
5. Pay exact amount

🔗 ${data.checkout_url}`;

        } catch {
          return "❌ Payment failed.";
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
            body: JSON.stringify({
              userId: chatId
            })
          });

          const data = await res.json();

          return `💰 BALANCE

₱${data.balance}`;
        } catch {
          return "❌ Failed to fetch balance.";
        }
      },

      // =========================
      // 🔍 USER LOOKUP (NEW FEATURE)
      // =========================
      "lookup": async () => {
        return `🔍 USER LOOKUP

Format:
lookup 09123456789`;
      },

      // =========================
      // 🔐 ADMIN
      // =========================
      "admin": async () => {
        if (!isAdmin) return "❌ Access denied.";

        return `🔐 ADMIN PANEL

approve withdrawId
reject withdrawId
stats`;
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
      }

    };

    // =========================
    // 🔥 SMART PARSERS
    // =========================

    // 🔍 LOOKUP USER
    if (text.startsWith("lookup ")) {

      const mobile = text.split(" ")[1];

      try {
        const res = await fetch("https://clickcoin.site/.netlify/functions/getUserByMobile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile })
        });

        const data = await res.json();

        if (!data || data.error) {
          reply = "❌ User not found";
        } else {
          reply = `👤 USER DETAILS

📱 ${data.mobile}
💰 Balance: ₱${data.balance}
📥 Deposit: ₱${data.totalDeposit}
📈 Earnings: ₱${data.balance - data.totalDeposit}`;
        }

      } catch {
        reply = "❌ Lookup failed";
      }

    }

    // 💸 WITHDRAW
    else if (text.startsWith("withdraw ")) {
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
            reply = data.error ? "❌ " + data.error : "✅ Withdraw submitted";

          } catch {
            reply = "❌ Withdraw failed";
          }
        }
      }

    }

    // 🔐 APPROVE
    else if (text.startsWith("approve ")) {
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
    }

    // ❌ REJECT
    else if (text.startsWith("reject ")) {
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
    }

    // 📋 COMMANDS
    else if (commands[text]) {
      reply = await commands[text]();
    }

    // ❌ UNKNOWN
    else {
      reply = `❌ Unknown command

Type:
menu`;
    }

    // =========================
    // 📤 SEND TELEGRAM MESSAGE
    // =========================
    const postData = JSON.stringify({
      chat_id: chatId,
      text: reply
    });

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${TOKEN}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json" }
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
    console.error(err);
    return {
      statusCode: 500,
      body: err.message
    };
  }
};