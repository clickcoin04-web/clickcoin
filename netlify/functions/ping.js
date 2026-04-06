exports.handler = async () => {
  await fetch("https://clickcoin-api.onrender.com");
  return {
    statusCode: 200,
    body: "pong"
  };
};