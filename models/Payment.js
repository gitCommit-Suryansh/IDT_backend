const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    participationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContestParticipation",
      required: true,
    },
    merchantOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    transactionId: {
      type: String, // Transaction ID from Gateway
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true, // in INR
    },
    status: {
      type: String,
      enum: ["INITIATED", "SUCCESS", "FAILED", "EXPIRED"],
      default: "INITIATED",
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
