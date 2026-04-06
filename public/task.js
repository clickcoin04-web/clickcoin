// ==========================
// 🔥 AUTO EARNINGS SYSTEM
// ==========================
import { ref, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function processEarnings() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) return;

  let myTasks = JSON.parse(localStorage.getItem("myTasks")) || [];
  if (myTasks.length === 0) return;

  let totalEarnedNow = 0;

  const now = Date.now();

  myTasks = myTasks.map(task => {

    const start = task.startTime;
    const end = start + task.duration;

    if (now >= end) return task; // tapos na

    // 🔥 COMPUTE DAILY INCOME BASED SA TIME
    const daysPassed = Math.floor((now - start) / (24 * 60 * 60 * 1000));

    const shouldEarn = daysPassed * task.dailyIncome;

    // 🔥 PREVENT DOUBLE EARN
    if (shouldEarn > task.earned) {
      const diff = shouldEarn - task.earned;
      task.earned += diff;
      totalEarnedNow += diff;
    }

    return task;
  });

  // SAVE UPDATED TASKS
  localStorage.setItem("myTasks", JSON.stringify(myTasks));

  // 🔥 UPDATE WALLET IF MAY KITA
  if (totalEarnedNow > 0) {
    const newBalance = (user.wallet || 0) + totalEarnedNow;

    await update(ref(db, 'users/' + user.uid), {
      balance: newBalance
    });

    // UPDATE LOCAL
    user.wallet = newBalance;
    localStorage.setItem("currentUser", JSON.stringify(user));

    console.log("💸 Earned:", totalEarnedNow);
  }
}

// RUN EVERY 5 SECONDS (REALTIME FEEL)
setInterval(() => {
  processEarnings();
}, 5000);

if (totalEarnedNow > 0) {
  alert("💸 You earned ₱" + totalEarnedNow);
}

// ==========================
// 🔥 CLAIM SYSTEM
// ==========================
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

window.claimTask = async function(index) {
  let user = JSON.parse(localStorage.getItem("currentUser"));
  let myTasks = JSON.parse(localStorage.getItem("myTasks")) || [];

  if (!user || !myTasks[index]) return;

  const task = myTasks[index];

  const now = Date.now();
  const start = task.startTime;

  // COMPUTE EARNED
  const daysPassed = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  const totalShouldEarn = daysPassed * task.dailyIncome;

  const claimable = totalShouldEarn - (task.claimed || 0);

  if (claimable <= 0) {
    alert("No earnings yet");
    return;
  }

  // UPDATE CLAIMED
  task.claimed = (task.claimed || 0) + claimable;

  // UPDATE TASKS
  myTasks[index] = task;
  localStorage.setItem("myTasks", JSON.stringify(myTasks));

  // UPDATE WALLET
  const newBalance = (user.wallet || 0) + claimable;

  await update(ref(db, 'users/' + user.uid), {
    balance: newBalance
  });

  user.wallet = newBalance;
  localStorage.setItem("currentUser", JSON.stringify(user));

  // 🔥 ANIMATION EFFECT
  showClaimAnimation(claimable);

};

function showClaimAnimation(amount) {
  const div = document.createElement("div");

  div.innerText = "💸 +" + amount;
  div.style.position = "fixed";
  div.style.top = "50%";
  div.style.left = "50%";
  div.style.transform = "translate(-50%, -50%)";
  div.style.fontSize = "28px";
  div.style.color = "gold";
  div.style.zIndex = "9999";
  div.style.transition = "all 1s ease";

  document.body.appendChild(div);

  setTimeout(() => {
    div.style.top = "30%";
    div.style.opacity = "0";
  }, 100);

  setTimeout(() => {
    div.remove();
  }, 1200);
}