// ================= FIREBASE =================
import { getDatabase, ref, onValue, update, get } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const db = getDatabase();

// ================= USER =================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser || !currentUser.uid) {
  window.location.href = "index.html";
}

const uid = currentUser.uid;

// ================= ELEMENTS =================
const totalRefs = document.getElementById("totalRefs");
const refEarnings = document.getElementById("refEarnings");
const inviteCodeEl = document.getElementById("inviteCode");
const inviteLinkEl = document.getElementById("inviteLink");
const refList = document.getElementById("refList");

const lvl1El = document.getElementById("lvl1");
const lvl2El = document.getElementById("lvl2");

// ✅ FIX: missing elements
const lvl1Size = document.getElementById("lvl1Size");
const lvl2Size = document.getElementById("lvl2Size");
const lvl3Size = document.getElementById("lvl3Size");
const teamSize = document.getElementById("teamSize");

// ================= INVITE GENERATOR =================
async function generateInvite(userData) {
  let code = userData.myInviteCode;

  if (!code) {
    code = "CC" + uid.substring(0, 6).toUpperCase();

    await update(ref(db, "users/" + uid), {
      myInviteCode: code
    });

    localStorage.setItem("currentUser", JSON.stringify({
      ...currentUser,
      myInviteCode: code
    }));
  }

  inviteCodeEl.innerText = code;
  inviteLinkEl.innerText =
    location.origin + "/public/register.html?ref=" + code;

  return code;
}

// ================= USER DATA LISTENER =================
onValue(ref(db, "users/" + uid), async (snap) => {
  if (!snap.exists()) return;

  const userData = snap.val();

  const myCode = await generateInvite(userData);

  // earnings
  refEarnings.innerText =
    "₱" + (userData.commissionEarned || 0).toFixed(2);

  // ================= TEAM COUNT =================
  const team = userData.team || {};

  const lvl1 = team.level1 ? Object.keys(team.level1).length : 0;
  const lvl2 = team.level2 ? Object.keys(team.level2).length : 0;

  if (lvl1El) lvl1El.innerText = lvl1;
  if (lvl2El) lvl2El.innerText = lvl2;

});

// ================= TEAM LOADER =================
function loadTeam(){

const user = JSON.parse(localStorage.getItem("currentUser"));
if(!user) return;

const uid = user.uid;

let lvl1=0,lvl2=0,lvl3=0;

// ✅ FIX: db.ref → ref(db,...)
onValue(ref(db,"users/"+uid+"/team/level1"), snap=>{
lvl1 = snap.exists() ? Object.keys(snap.val()).length : 0;
if(lvl1Size) lvl1Size.innerText = lvl1;
});

onValue(ref(db,"users/"+uid+"/team/level2"), snap=>{
lvl2 = snap.exists() ? Object.keys(snap.val()).length : 0;
if(lvl2Size) lvl2Size.innerText = lvl2;
});

onValue(ref(db,"users/"+uid+"/team/level3"), snap=>{
lvl3 = snap.exists() ? Object.keys(snap.val()).length : 0;
if(lvl3Size) lvl3Size.innerText = lvl3;
});

if(teamSize) teamSize.innerText = lvl1 + lvl2 + lvl3;
}

// ================= LOAD REFERRALS =================
onValue(ref(db, "users"), (snap) => {

  if (!snap.exists()) return;

  const users = snap.val();

  let count = 0;
  let html = "";

  let myCode = currentUser.myInviteCode;

  if (!myCode) return;

  Object.values(users).forEach(u => {

    if (u.referredBy === myCode) {

      count++;

      // 🔥 SPACING FIX ONLY (no logic change)
      html += `
        <div style="
          margin-bottom:15px;
          padding:15px;
          background:#111;
          border-radius:12px;
          box-shadow:0 0 8px rgba(255,215,0,0.15);
        ">
          <div style="font-weight:bold;margin-bottom:5px;">
            👤 ${u.username || "User"}
          </div>
          <div style="opacity:0.7;">
            💰 ₱${(u.totalDeposit || 0).toFixed(2)}
          </div>
        </div>
      `;
    }

  });

  totalRefs.innerText = count;
  refList.innerHTML = html || "No referrals yet";

});

// ==========================
// 🔥 OPEN TEAM LEVEL
// ==========================
function openLevel(level){

const user = JSON.parse(localStorage.getItem("currentUser"));
if(!user) return;

const uid = user.uid;

// ✅ FIX: once → get
get(ref(db,"users/"+uid+"/team/level"+level)).then(snap=>{

if(!snap.exists()){
localStorage.setItem("team_lvl"+level, JSON.stringify([]));
localStorage.setItem("selectedLevel", level);
window.location.href="team-list.html";
return;
}

const ids = Object.keys(snap.val());

get(ref(db,"users")).then(allSnap=>{

const allUsers = allSnap.val();
let list = [];

ids.forEach(id=>{
if(allUsers[id]){
list.push(allUsers[id]);
}
});

// SAVE
localStorage.setItem("team_lvl"+level, JSON.stringify(list));
localStorage.setItem("selectedLevel", level);

// GO PAGE
window.location.href="team-list.html";

});

});

}