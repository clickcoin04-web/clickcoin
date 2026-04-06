// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const database = firebase.database();

// ================= SAFE PARSE =================
function safeParse(data) {
  try { return JSON.parse(data); } catch { return null; }
}

// ================= FORMAT PHP =================
function formatPHP(amount) {
  return "₱" + Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ================= LOAD USER =================
function loadUser() {
  const user = safeParse(localStorage.getItem("currentUser"));

  if (!user) {
    checkFirebaseUser();
    return;
  }

  let mobile = user.mobile || "";
  if (!mobile.startsWith("+63")) {
    mobile = "+63" + mobile.replace(/^0/, "");
  }

  document.getElementById("mobile").innerText = mobile;
  document.getElementById("wallet").innerText = formatPHP(user.wallet || 0);

  generateInvite();
}

// ================= FIREBASE CHECK =================
function checkFirebaseUser() {
  auth.onAuthStateChanged(user => {
    if (user) {
      const uid = user.uid;
      const userRef = database.ref('users/' + uid);

      userRef.once('value', snapshot => {
        const userData = snapshot.val();
        if (!userData) return;

        // 🔥 IMPORTANT: include UID
        userData.uid = uid;

        localStorage.setItem("currentUser", JSON.stringify(userData));
        loadUser();
      });
    } else {
      window.location.href = "index.html";
    }
  });
}

// ================= NAV =================
function goPage(page) {
  window.location.href = page;
}

// ================= LOGOUT =================
function logout() {
  auth.signOut().then(() => {
    addLog("LOGOUT", "User logged out");
    localStorage.removeItem("currentUser");
    alert("Logged out successfully");
    window.location.href = "index.html";
  });
}

// ================= LOGS =================
function addLog(type, details = "") {
  let logs = JSON.parse(localStorage.getItem("logs")) || [];

  logs.push({
    type: type,
    details: details,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("logs", JSON.stringify(logs));
}

// ================= INVITE SYSTEM =================
function generateInvite(){
  const user = safeParse(localStorage.getItem("currentUser"));
  if(!user || !user.uid) return;

  let code = user.myInviteCode;

  // 🔥 AUTO GENERATE UNIQUE CODE PER USER (ONCE ONLY)
  if(!code){
    code = "CC" + Math.random().toString(36).substring(2,8).toUpperCase();
    user.myInviteCode = code;

    localStorage.setItem("currentUser", JSON.stringify(user));
    database.ref("users/" + user.uid).update({ myInviteCode: code });
  }

  // 🔥 FIXED LOCALHOST LINK FORMAT (AS REQUESTED)
  const link = "http://127.0.0.1:5500/public/register.html?ref=" + code;

  document.getElementById("inviteCode").value = code;
  document.getElementById("inviteLink").value = link;
}

// ================= COPY =================
function copyLink(){
  const el = document.getElementById("inviteLink");
  navigator.clipboard.writeText(el.value);
  alert("Copied!");
}

function copyCode(){
  const el = document.getElementById("inviteCode");
  navigator.clipboard.writeText(el.value);
  alert("Copied!");
}

// ================= INIT =================
loadUser();

function loadReferralEarnings(){
const user = safeParse(localStorage.getItem("currentUser"));
if(!user || !user.uid) return;

database.ref("users/"+user.uid+"/refEarnings").on("value", snap=>{
const val = snap.val() || 0;
document.getElementById("refIncome").innerText = formatPHP(val);
});
}