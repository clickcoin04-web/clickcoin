// ==========================
// 🔥 FIREBASE IMPORTS (TOP ONLY)
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  get,
  set,
  push,
  update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ==========================
// 🔥 CONFIG
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyCMLY-oyKc2rKjOATw5Yplcr_MY1fVH3m4",
  authDomain: "clickcoin-81040.firebaseapp.com",
  databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clickcoin-81040",
  storageBucket: "clickcoin-81040.appspot.com",
  messagingSenderId: "227649837889",
  appId: "1:227649837889:web:81ac51f2e358ed2231dfc0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ==========================
// 🔐 PROTECT PAGE
// ==========================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
  window.location.href = "index.html";
}

// ==========================
// 🔥 LOCAL STORAGE
// ==========================
function saveUserLocal(userData) {
  localStorage.setItem("currentUser", JSON.stringify(userData));
}

// ==========================
// 🔥 LOGIN FUNCTION
// ==========================
window.loginUser = async function () {
  const mobile = document.getElementById("mobile").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!mobile || !password) {
    alert("Fill all fields");
    return;
  }

  // ==========================
  // 🔥 ADMIN LOGIN
  // ==========================
  if (mobile === "ADMIN" && password === "Matt@0404") {
    const adminData = {
      uid: "admin",
      username: "Administrator",
      mobile: "ADMIN",
      wallet: 999999,
      role: "admin"
    };

    saveUserLocal(adminData);

    alert("Admin Login Success 👑");
    window.location.href = "admin.html";
    return;
  }

  // ==========================
  // 🔥 NORMAL USER LOGIN
  // ==========================
  try {
    let formattedMobile = mobile;

    if (mobile.startsWith("09")) {
      formattedMobile = "63" + mobile.substring(1);
    }

    if (mobile.startsWith("+63")) {
      formattedMobile = mobile.replace("+", "");
    }

    const email = formattedMobile + "@clickcoin.com";

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const snapshot = await get(ref(db, "users/" + user.uid));

    if (!snapshot.exists()) {
      alert("User not found");
      return;
    }

    const userData = snapshot.val();

    if (userData.status === "banned") {
      alert("Account banned 🚫");
      return;
    }

    const finalData = {
      uid: user.uid,
      username: userData.username || "User",
      mobile: formattedMobile,
      wallet: userData.balance || 0,
      role: "user"
    };

    saveUserLocal(finalData);

    // LOG LOGIN
    await set(ref(db, "logs/" + Date.now()), {
      uid: user.uid,
      action: "login",
      time: Date.now()
    });

    alert("Login Success ✅");
    window.location.href = "home.html";

  } catch (error) {
    alert("Login Failed ❌");
    console.error(error);
  }
};

// ==========================
// 🌐 SECRET ADMIN ACCESS
// ==========================
if (window.location.hash === "#admin") {
  const pass = prompt("Admin Password");

  if (pass === "Matt@0404") {
    const adminData = {
      uid: "admin-0001",
      username: "ADMIN",
      mobile: "ADMIN",
      role: "admin"
    };

    localStorage.setItem("currentUser", JSON.stringify(adminData));
    window.location.href = "admin.html";
  }
}