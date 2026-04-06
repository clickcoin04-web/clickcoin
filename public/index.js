// ===============================
// 🔥 CLICKCOIN INDEX.JS (ULTRA)
// ===============================

// ✅ Safe JSON parser
function safeParse(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ✅ Redirect helpers
function goLogin() {
  window.location.href = "login.html";
}

function goRegister() {
  window.location.href = "register.html";
}

// ✅ Check if user exists
function getCurrentUser() {
  return safeParse(localStorage.getItem("currentUser"));
}

// ✅ Auto Login System
function autoLogin() {
  const user = getCurrentUser();

  if (user) {
    console.log("✅ Auto login success:", user.username || user.mobile);

    // small delay for smooth UX
    setTimeout(() => {
      window.location.href = "home.html";
    }, 500);
  } else {
    console.log("❌ No active session");
  }
}

// ===============================
// 🔥 SESSION CHECK (ANTI-BUG)
// ===============================
function validateSession() {
  const user = getCurrentUser();

  if (!user) return;

  // Optional: expire session after long time
  const now = Date.now();
  const lastLogin = user.lastLogin || now;

  const SESSION_LIMIT = 24 * 60 * 60 * 1000; // 24 hours

  if (now - lastLogin > SESSION_LIMIT) {
    console.log("⏰ Session expired");

    localStorage.removeItem("currentUser");
  }
}

// ===============================
// 🔥 DEVICE TRACKING
// ===============================
function trackDevice() {
  const user = getCurrentUser();
  if (!user) return;

  user.device = navigator.userAgent;
  user.lastLogin = Date.now();

  localStorage.setItem("currentUser", JSON.stringify(user));
}

// ===============================
// 🔥 INIT
// ===============================
window.addEventListener("load", () => {
  validateSession();
  trackDevice();
  autoLogin();
});

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const axios = require("axios");
const cors = require("cors");

admin.initializeApp();
const db = admin.database();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PAYMONGO_SECRET = "sk_test_xxx"; // palitan mo

// 🔥 CREATE PAYMENT LINK
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, uid } = req.body;

    const response = await axios.post(
      "https://api.paymongo.com/v1/links",
      {
        data: {
          attributes: {
            amount: amount * 100,
            description: "ClickCoin Deposit",
            remarks: uid // 🔥 dito natin lalagay UID
          }
        }
      },
      {
        headers: {
          Authorization:
            "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64"),
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutUrl = response.data.data.attributes.checkout_url;

    res.json({ url: checkoutUrl });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error creating payment");
  }
});


// 🔥 WEBHOOK (AUTO CREDIT)
app.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.data.attributes.status === "paid") {
      const amount = event.data.attributes.amount / 100;
      const uid = event.data.attributes.remarks;

      if (!uid) return res.sendStatus(200);

      // 🔥 add balance
      const userRef = db.ref("users/" + uid);

      await userRef.transaction(user => {
        if (user) {
          user.wallet = (user.wallet || 0) + amount;
        }
        return user;
      });

      // 🔥 save log
      await db.ref("deposits").push({
        uid,
        amount,
        status: "paid",
        date: Date.now()
      });

      console.log("SUCCESS:", uid, amount);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

exports.api = functions.https.onRequest(app);