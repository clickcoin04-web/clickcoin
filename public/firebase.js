// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCMLY-oyKc2rKjOATw5Yplcr_MY1fVH3m4",
  authDomain: "clickcoin-81040.firebaseapp.com",
  databaseURL: "https://clickcoin-81040-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "clickcoin-81040",
  storageBucket: "clickcoin-81040.firebasestorage.app",
  messagingSenderId: "227649837889",
  appId: "1:227649837889:web:81ac51f2e358ed2231dfc0",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();