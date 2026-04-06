// 🔥 REGISTER USER - Generates Referral Code
function registerUser() {
  const username = document.getElementById("username").value;
  const mobile = document.getElementById("mobile").value;
  const password = document.getElementById("password").value;

  if (!username || !mobile || !password) {
    alert("Fill all fields");
    return;
  }

  const email = `${mobile}@clickcoin.com`;

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      // Generate a unique invite code (e.g., based on user UID)
      const inviteCode = "CC" + cred.user.uid.substring(0, 6);  // Use a portion of the UID as the invite code

      const userData = {
        username,
        mobile,
        wallet: 0,
        createdAt: Date.now(),
        inviteCode,  // Store the invite code
      };


      // Save user data in Firebase along with the invite code
      db.ref("users/" + cred.user.uid).set(userData)
        .then(() => {
          saveUserLocal({ uid: cred.user.uid, ...userData });
          redirectToHome();
        });
    })
    .catch(err => alert(err.message));
}

import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const db = getDatabase();

// 🔥 APPLY REFERRAL COMMISSION
async function applyReferral(refCode, newUserUid) {
  if (!refCode) return;
  await applyReferral(refCode, user.uid);

  const inviteRef = ref(db, "invites/" + refCode);
  const snap = await get(inviteRef);

  if (!snap.exists()) return;

  const parentUid = snap.val().owner;

  // LEVEL 1 COMMISSION
  await update(ref(db, "users/" + parentUid), {
    balance: (snap.val().balance || 0) + 10
  });

  // 🔥 LEVEL 2 (optional)
  const parentData = await get(ref(db, "users/" + parentUid));
  const parentRefCode = parentData.val().referredBy;

  if (parentRefCode) {
    const lvl2Snap = await get(ref(db, "invites/" + parentRefCode));
    if (lvl2Snap.exists()) {
      const lvl2Uid = lvl2Snap.val().owner;

      await update(ref(db, "users/" + lvl2Uid), {
        balance: (lvl2Snap.val().balance || 0) + 5
      });
    }
  }
}