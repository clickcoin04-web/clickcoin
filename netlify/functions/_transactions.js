const crypto = require("crypto");
const { getDB } = require("./_db");

async function createTransaction({ userId, type, amount, reference }) {
  const db = await getDB();

  if (!userId || !type || !amount || !reference) {
    throw new Error("Missing transaction fields");
  }

  // 🔒 prevent duplicate reference
  const existing = await db.collection("transactions").findOne({ reference });
  if (existing) return existing;

  const tx = {
    txId: crypto.randomUUID(),
    userId,
    type, // deposit / withdraw
    amount: Number(amount),
    reference,
    status: "pending",
    createdAt: new Date()
  };

  await db.collection("transactions").insertOne(tx);

  return tx;
}

async function completeTransaction(reference) {
  const db = await getDB();

  if (!reference) throw new Error("Missing reference");

  // 🔥 ATOMIC TRANSACTION FIX
  const session = db.client?.startSession?.();

  try {
    if (session) session.startTransaction();

    const tx = await db.collection("transactions").findOne({ reference });

    if (!tx) throw new Error("Transaction not found");

    if (tx.status === "completed") {
      if (session) await session.abortTransaction();
      return tx;
    }

    if (tx.type !== "deposit") {
      if (session) await session.abortTransaction();
      throw new Error("Invalid transaction type");
    }

    // 🔥 ENSURE USER EXISTS
    const user = await db.collection("users").findOne({ _id: tx.userId });

    if (!user) {
      if (session) await session.abortTransaction();
      throw new Error("User not found");
    }

    // 🔒 UPDATE BALANCE
    await db.collection("users").updateOne(
      { _id: tx.userId },
      { $inc: { balance: tx.amount } }
    );

    // 🔒 MARK COMPLETE
    await db.collection("transactions").updateOne(
      { reference },
      { $set: { status: "completed", completedAt: new Date() } }
    );

    if (session) await session.commitTransaction();

    return tx;

  } catch (err) {
    if (session) await session.abortTransaction();
    console.error("❌ completeTransaction error:", err);
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

module.exports = {
  createTransaction,
  completeTransaction
};