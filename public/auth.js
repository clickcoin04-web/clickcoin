// 🔥 USER AUTHENTICATION AND LOCAL STORAGE

// Save user data to localStorage
function saveUserLocal(userData) {
  localStorage.setItem("currentUser", JSON.stringify(userData));
  console.log("User saved:", userData);  // Debugging log
}

// Retrieve user data from localStorage
function getUser() {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  console.log("Fetched user from localStorage:", user);  // Debugging log
  return user;
}

// Handle user authentication state changes
function handleAuthChange(user) {
  if (user) {
    db.ref("users/" + user.uid).once("value")
      .then(snapshot => {
        const data = snapshot.val();
        const userData = {
          uid: user.uid,
          username: data.username,
          mobile: data.mobile,
          wallet: data.wallet || 0,  // Default wallet to 0 if not available
          inviteCode: data.inviteCode, // Ensure the invite code is saved
        };
        saveUserLocal(userData);  // Save the user data to localStorage
        redirectToHome();  // Redirect to the home page after login
      })
      .catch(err => console.error("Error fetching user data:", err));
  }
}

// Redirect user to the home page after login
function redirectToHome() {
  if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
    window.location.href = "home.html";  // Redirect to the home page
  }
}

// Firebase auth state listener
auth.onAuthStateChanged(handleAuthChange);  // Listen for user authentication state changes