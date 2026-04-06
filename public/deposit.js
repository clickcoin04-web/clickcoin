// ===============================
// 🔥 CLICKCOIN DEPOSIT.JS (GOD MODE)
// ===============================

// Firebase config (V8)
const firebaseConfig = {
  apiKey: "AIzaSyCMLY-oyKc2rKjOATw5Yplcr_MY1fVH3m4",
  authDomain: "clickcoin-81040.firebaseapp.com",
  databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clickcoin-81040",
};

// Init Firebase (safe)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Global user
let currentUser = null;


// ===============================
// 💰 FORMAT PHP
// ===============================
function formatPHP(amount) {
  return "₱" + Number(amount || 0).toLocaleString('en-PH');
}


// ===============================
// 🚀 INIT PAGE
// ===============================
function initDepositPage() {
  currentUser = JSON.parse(localStorage.getItem("currentUser"));

  // 🔐 security check
  if (!currentUser || !currentUser.uid) {
    window.location.href = "index.html";
    return;
  }

  // show wallet
  const walletEl = document.getElementById("wallet");
  if (walletEl) {
    walletEl.innerText = formatPHP(currentUser.wallet);
  }

  // 🔥 REALTIME WALLET LISTENER
  db.ref("users/" + currentUser.uid).on("value", snap => {
    if (snap.exists()) {
      const data = snap.val();

      currentUser.wallet = data.balance || 0;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));

      if (walletEl) {
        walletEl.innerText = formatPHP(currentUser.wallet);
      }
    }
  });
}


// ===============================
// 🎯 SET AMOUNT
// ===============================
function setDepositAmount(amount) {
  const input = document.getElementById("amount");
  if (input) input.value = amount;
}


// ===============================
// 🚀 SUBMIT DEPOSIT (WITH BACKEND)
// ===============================
async function submitDeposit() {
  const input = document.getElementById("amount");
  let amount = parseFloat(input.value);

  if (!amount || amount < 50) {
    alert("Minimum ₱50");
    return;
  }

  try {
    // 🔥 CALL BACKEND (RENDER)
    const res = await fetch("https://clickcoin-backend.onrender.com/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount
      })
    });

    const data = await res.json();

    console.log("Backend response:", data);

    // 🚀 REDIRECT TO GCASH CHECKOUT
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      alert("Payment failed");
    }

  } catch (err) {
    console.error("ERROR:", err);
    alert("Server error");
  }
}

// ===============================
// 🔙 BACK
// ===============================
function goBack() {
  window.location.href = "account.html";
}


// ===============================
// 🌍 AUTO INIT (OPTIONAL)
// ===============================
window.initDepositPage = initDepositPage;
window.setDepositAmount = setDepositAmount;
window.submitDeposit = submitDeposit;
window.goBack = goBack;