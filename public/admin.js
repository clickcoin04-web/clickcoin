// ==========================
// 🔥 FIREBASE IMPORTS
// ==========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  get,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================
// 🔥 CONFIG
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyCMLY-oyKc2rKjOATw5Yplcr_MY1fVH3m4",
  authDomain: "clickcoin-81040.firebaseapp.com",
  databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clickcoin-81040"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}

// ==========================
// 🔐 ADMIN SECURITY (FIXED)
// ==========================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  alert("LOGIN REQUIRED ❌");
  window.location.href = "index.html";
}

// ✅ HARDCODED ADMIN (WORKING SA SYSTEM MO)
if (currentUser.mobile !== "ADMIN" || currentUser.role !== "admin") {
  alert("ACCESS DENIED ❌");
  window.location.href = "index.html";
}

// ==========================
// 📊 ANALYTICS
// ==========================
let totalDep = 0;
let totalWith = 0;

onValue(ref(db, "users"), (snap) => {
  document.getElementById("totalUsers").innerText = snap.size || 0;
});

onValue(ref(db, "deposits"), (snap) => {
  totalDep = 0;

  snap.forEach(d => {
    totalDep += Number(d.val().amount || 0);
  });

  document.getElementById("totalDeposits").innerText = totalDep;
  updateProfit();
  updateChart();
});

onValue(ref(db, "withdraws"), (snap) => {
  totalWith = 0;

  snap.forEach(w => {
    totalWith += Number(w.val().amount || 0);
  });

  document.getElementById("totalWithdraws").innerText = totalWith;
  updateProfit();
  updateChart();
});

function updateProfit() {
  document.getElementById("profit").innerText = totalDep - totalWith;
}

// ==========================
// 📊 CHART
// ==========================
let chart;

function updateChart() {
  const ctx = document.getElementById("financeChart");
  if (!ctx) return;

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Deposits", "Withdrawals"],
      datasets: [{
        label: "₱ Flow",
        data: [totalDep, totalWith]
      }]
    },
    options: {
      animation: {
        duration: 1200
      }
    }
  });
}

// ==========================
// 👥 USERS
// ==========================
const userList = document.getElementById("userList");

onValue(ref(db, "users"), (snapshot) => {
  userList.innerHTML = "";

  snapshot.forEach((child) => {
    const u = child.val();
    const uid = child.key;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <p><b>${u.username || "No Name"}</b></p>
      <p>${u.mobile || "-"}</p>
      <p>₱${u.balance || 0}</p>

      <input id="bal_${uid}" placeholder="New Balance">
      <button onclick="updateBalance('${uid}')">Update</button>
      <button onclick="banUser('${uid}')">Ban</button>
    `;

    userList.appendChild(div);
  });
});

window.updateBalance = async (uid) => {
  const val = document.getElementById("bal_" + uid).value;

  if (!val) return alert("Enter value");

  await update(ref(db, "users/" + uid), {
    balance: Number(val)
  });

  alert("Balance Updated ✅");
};

window.banUser = async (uid) => {
  await update(ref(db, "users/" + uid), {
    status: "banned"
  });

  alert("User Banned 🚫");
};

// ==========================
// 💸 WITHDRAW
// ==========================
const withdrawList = document.getElementById("withdrawList");

onValue(ref(db, "withdraws"), (snap) => {
  withdrawList.innerHTML = "";

  snap.forEach((c) => {
    const w = c.val();
    const id = c.key;

    if (w.status === "pending") {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <p>User: ${w.uid}</p>
        <p>₱${w.amount}</p>
        <button onclick="approveWithdraw('${id}')">Approve</button>
      `;

      withdrawList.appendChild(div);
    }
  });
});

window.approveWithdraw = async (id) => {
  const snap = await get(ref(db, "withdraws/" + id));
  const w = snap.val();

  const userRef = ref(db, "users/" + w.uid);
  const userSnap = await get(userRef);
  const u = userSnap.val();

  const newBal = (u.balance || 0) - Number(w.amount);

  await update(userRef, { balance: newBal });

  await set(ref(db, "ledger/" + Date.now()), {
    uid: w.uid,
    type: "withdraw",
    amount: w.amount,
    date: Date.now()
  });

  await update(ref(db, "withdraws/" + id), {
    status: "approved"
  });

  alert("Withdraw Approved 💸");
};

// ==========================
// 📥 DEPOSITS
// ==========================
const depositList = document.getElementById("depositList");

onValue(ref(db, "deposits"), (snap) => {
  depositList.innerHTML = "";

  snap.forEach((c) => {
    const d = c.val();
    const id = c.key;

    if (d.status === "pending") {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <p>User: ${d.uid}</p>
        <p>₱${d.amount}</p>
        <img src="${d.proof || ''}" style="width:100%;border-radius:8px;">
        <button onclick="approveDeposit('${id}')">Approve</button>
      `;

      depositList.appendChild(div);
    }
  });
});

window.approveDeposit = async (id) => {
  const snap = await get(ref(db, "deposits/" + id));
  const d = snap.val();

  const userRef = ref(db, "users/" + d.uid);
  const userSnap = await get(userRef);
  const u = userSnap.val();

  const newBal = (u.balance || 0) + Number(d.amount);

  await update(userRef, { balance: newBal });

  await set(ref(db, "ledger/" + Date.now()), {
    uid: d.uid,
    type: "deposit",
    amount: d.amount,
    date: Date.now()
  });

  await update(ref(db, "deposits/" + id), {
    status: "approved"
  });

  alert("Deposit Approved 📥");
};

// ==========================
// 📩 SUPPORT CHAT
// ==========================
const chatList = document.getElementById("chatList");

onValue(ref(db, "messages"), (snap) => {
  chatList.innerHTML = "";

  snap.forEach((c) => {
    const msg = c.val();
    const id = c.key;

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <p>${msg.message}</p>
      <input id="reply_${id}" placeholder="Reply">
      <button onclick="reply('${id}')">Send</button>
    `;

    chatList.appendChild(div);
  });
});

window.reply = async (id) => {
  const text = document.getElementById("reply_" + id).value;

  await update(ref(db, "messages/" + id), {
    reply: text
  });

  alert("Reply Sent 📩");
};

// ==========================
// 🔔 NOTIFICATIONS
// ==========================
const notifList = document.getElementById("notifList");
const notifBadge = document.getElementById("notifBadge");

onValue(ref(db, "notifications"), (snapshot) => {
  notifList.innerHTML = "";
  let count = 0;

  snapshot.forEach(nSnap => {
    count++;

    const n = nSnap.val();

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `<p>${n.message}</p>`;
    notifList.prepend(div);
  });

  notifBadge.innerText = count;
});

import { push, ref, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function withdrawRequest(amount) {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user) return;

  const newRef = push(ref(db, "withdraws"));

  await update(newRef, {
    uid: user.uid,
    username: user.username,
    amount: amount,
    status: "pending",
    time: Date.now()
  });

  alert("Withdraw submitted");
}

// ==========================
// 🔥 AUTO APPROVE WITHDRAW
// ==========================
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

function autoApproveWithdraws() {
  const withdrawRef = ref(db, "withdraws");

  onValue(withdrawRef, async (snap) => {
    if (!snap.exists()) return;

    const data = snap.val();

    for (let id in data) {
      const w = data[id];

      if (w.status === "pending") {

        const userRef = ref(db, "users/" + w.uid);
        const userSnap = await get(userRef);

        if (!userSnap.exists()) continue;

        const userData = userSnap.val();

        // CHECK BALANCE
        if ((userData.balance || 0) >= w.amount) {

          // DEDUCT
          const newBalance = userData.balance - w.amount;

          await update(userRef, {
            balance: newBalance
          });

          // APPROVE
          await update(ref(db, "withdraws/" + id), {
            status: "approved"
          });

          // 🔔 NOTIFICATION
          await update(ref(db, "notifications/" + Date.now()), {
            type: "withdraw",
            message: userData.username + " withdraw ₱" + w.amount,
            time: Date.now()
          });

          console.log("✅ Auto approved:", w.amount);
        } else {
          // REJECT IF LOW BALANCE
          await update(ref(db, "withdraws/" + id), {
            status: "rejected"
          });
        }
      }
    }
  });
}

// RUN
autoApproveWithdraws();