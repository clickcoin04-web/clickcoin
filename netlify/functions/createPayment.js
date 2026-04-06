exports.handler = async (event) => {
  const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET;

  if (!PAYMONGO_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing API key" }),
    };
  }

  let body = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const amount = body.amount;
  const uid = body.uid;

  if (!amount || !uid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing amount or uid" }),
    };
  }

  try {
    const response = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + Buffer.from(PAYMONGO_SECRET + ":").toString("base64"),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amount * 100,
            description: "Deposit",
            metadata: {
              uid: uid,
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!data.data) {
      return {
        statusCode: 500,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkout_url: data.data.attributes.checkout_url,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};