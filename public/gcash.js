const API_URL = "https://clickcoin-backend.onrender.com";

const amount = localStorage.getItem("depositAmount");

// 🚫 prevent multiple calls
let isProcessing = false;

function payWithGCash() {
  if (isProcessing) return;
  isProcessing = true;

  fetch(`${API_URL}/create-gcash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amount
    }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert("Payment failed");
        isProcessing = false;
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server is waking up, please try again...");
      isProcessing = false;
    });
}

// 🚀 run once only
window.onload = payWithGCash;