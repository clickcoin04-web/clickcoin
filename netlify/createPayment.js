exports.handler = async (event) => {
  const fetch = require("node-fetch");

  // 🔐 IMPORTANT: ilagay mo sa Netlify ENV
  const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;

  // ❌ check kung walang API key
  if (!PAYMONGO_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing PAYMONGO_SECRET in environment variables"
      })
    };
  }

  try {
    // 📥 parse request body
    const body = JSON.parse(event.body || "{}");
    let { amount } = body;

    // ❌ validation
    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid amount"
        })
      };
    }

    // 💰 convert to centavos
    amount = Math.floor(amount * 100);

    // 🚀 create PayMongo payment link
    const response = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64")
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amount,
            description: "ClickCoin Deposit",
            remarks: "Deposit via GCash",
          }
        }
      })
    });

    const data = await response.json();

    // ❌ handle PayMongo error
    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: data.errors ? data.errors[0].detail : "PayMongo error"
        })
      };
    }

    // ✅ success
    return {
      statusCode: 200,
      body: JSON.stringify({
        checkout_url: data.data.attributes.checkout_url
      })
    };

  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error"
      })
    };
  }
};