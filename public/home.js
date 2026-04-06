// ==========================
// 🔥 FIREBASE INIT
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, update, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMLY-oyKc2rKjOATw5Yplcr_MY1fVH3m4",
  authDomain: "clickcoin-81040.firebaseapp.com",
  databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clickcoin-81040",
  storageBucket: "clickcoin-81040.firebasestorage.app",
  messagingSenderId: "227649837889",
  appId: "1:227649837889:web:81ac51f2e358ed2231dfc0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.db = db;

// ==========================
// 🔥 FORMAT
// ==========================
function formatPHP(amount) {
  return "₱" + Number(amount).toLocaleString('en-PH');
}

// ==========================
// 🔥 UPDATE BALANCE UI
// ==========================
function updateBalance(balance) {
  const el = document.getElementById("wallet");

  if (!el) return;

  el.innerText = "BALANCE " + formatPHP(balance || 0);

  // ⚡ PREMIUM ANIMATION
  el.style.transform = "scale(1.1)";
  setTimeout(() => {
    el.style.transform = "scale(1)";
  }, 200);
}

// ==========================
// 🔥 TASK LIST DATA
// ==========================
const tasks = [
  { id: 1, name: "Task 1", price: 300, cycle: 100, dailyIncome: 30, totalRevenue: 3000, img: "task1.png" },
  { id: 2, name: "Task 2", price: 500, cycle: 100, dailyIncome: 50, totalRevenue: 5000, img: "task2.png" },
  { id: 3, name: "Task 3", price: 1000, cycle: 100, dailyIncome: 100, totalRevenue: 10000, img: "task3.png" },
  { id: 4, name: "Task 4", price: 2000, cycle: 100, dailyIncome: 200, totalRevenue: 20000, img: "task4.png" },
  { id: 5, name: "Task 5", price: 4000, cycle: 100, dailyIncome: 400, totalRevenue: 40000, img: "task5.png" },
  { id: 6, name: "Task 6", price: 5000, cycle: 100, dailyIncome: 500, totalRevenue: 50000, img: "task6.png" },
  { id: 7, name: "Task 7", price: 8000, cycle: 100, dailyIncome: 800, totalRevenue: 80000, img: "task7.png" },
  { id: 8, name: "Task 8", price: 10000, cycle: 100, dailyIncome: 1000, totalRevenue: 100000, img: "task8.png" },
  { id: 9, name: "Task 9", price: 15000, cycle: 100, dailyIncome: 1500, totalRevenue: 150000, img: "task9.png" },
  { id: 10, name: "Task 10", price: 20000, cycle: 100, dailyIncome: 2000, totalRevenue: 200000, img: "task10.png" }
];

// ==========================
// 🔥 LOAD TASKS UI
// ==========================
function loadTasks() {
  const container = document.getElementById("taskList");
  if (!container) return;

  container.innerHTML = "";

  tasks.forEach(task => {
    container.innerHTML += `
      <div class="card">
        <img src="${task.img}" onerror="this.src='LOGOClickCoin.png'">
        <div class="card-info">
          <h3>${task.name}</h3>
          <p>Price: ${formatPHP(task.price)}</p>
          <p>Daily: ${formatPHP(task.dailyIncome)}</p>
          <p>Cycle: ${task.cycle} days</p>
          <button class="buy-btn" onclick='buyTask(${JSON.stringify(task)})'>
            BUY
          </button>
        </div>
      </div>
    `;
  });
}

// ==========================
// 🔥 BUY TASK SYSTEM
// ==========================
window.buyTask = async function (task) {
  let user = JSON.parse(localStorage.getItem("currentUser"));

  if (!user) return;

  // ❌ NOT ENOUGH BALANCE
  if (user.wallet < task.price) {
    alert("Insufficient balance");
    window.location.href = "deposit.html";
    return;
  }

  const newBalance = user.wallet - task.price;

  // UPDATE FIREBASE
  await update(ref(db, 'users/' + user.uid), {
    balance: newBalance
  });

  // SAVE TASK
  let myTasks = JSON.parse(localStorage.getItem("myTasks")) || [];

  myTasks.push({
    name: task.name,
    price: task.price,
    dailyIncome: task.dailyIncome,
    totalRevenue: task.totalRevenue,
    startTime: Date.now(),
    duration: 100 * 24 * 60 * 60 * 1000,
    earned: 0
  });

  localStorage.setItem("myTasks", JSON.stringify(myTasks));

  // GO TASK PAGE
  window.location.href = "task.html";
};

// ==========================
// 🔥 AUTH + REALTIME BALANCE
// ==========================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userRef = ref(db, 'users/' + user.uid);

  // 🔥 REALTIME LISTENER
  onValue(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.val();

      const updatedUser = {
        ...data,
        uid: user.uid,
        wallet: data.balance || 0
      };

      // SAVE LOCAL
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      // UPDATE UI
      updateBalance(updatedUser.wallet);
    }
  });

  // LOAD UI
  loadTasks();
});