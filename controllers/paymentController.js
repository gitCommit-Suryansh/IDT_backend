const { v4: uuidv4 } = require("uuid");
const Contest = require("../models/contest");
const ContestParticipation = require("../models/contestParticipation");
const Payment = require("../models/Payment");
const User = require("../models/user");
const phonePeService = require("../services/phonePeService");

// POST /api/payment/initiate
exports.initiatePayment = async (req, res) => {
  try {
    const { contestId } = req.body;
    const firebaseUID = req.firebaseUID;
    console.log("firebaseUID", firebaseUID);
    console.log("contestId", contestId);

    if (!firebaseUID) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    // Check if free
    if (!contest.entryFee || contest.entryFee === 0) {
      return res
        .status(400)
        .json({ message: "Free contest, use /register endpoint" });
    }

    // 1. Create/Find Participation (PENDING)
    let participation = await ContestParticipation.findOne({
      userId: user._id,
      contestId: contest._id,
    });
    if (participation && participation.isPaid) {
      return res.status(200).json({ message: "Already paid", participation });
    }

    if (!participation) {
      participation = await ContestParticipation.create({
        userId: user._id,
        contestId: contest._id,
        isPaid: false,
        status: "REGISTERED", // Will valid only after payment
        paymentAmount: contest.entryFee,
      });
    }

    // 2. Create Payment Object
    const merchantOrderId = `IDT_${uuidv4().split("-")[0]}_${Date.now()}`; // Unique ID
    const amountInPaise = contest.entryFee * 100;

    console.log(
      "Creating Order for: Merchant Order ID: ",
      merchantOrderId,
      "Amount:",
      amountInPaise,
    );

    const payment = await Payment.create({
      userId: user._id,
      contestId: contest._id,
      participationId: participation._id,
      merchantOrderId: merchantOrderId,
      amount: contest.entryFee,
      status: "INITIATED",
    });

    // Link payment to participation
    participation.paymentId = payment._id;
    await participation.save();

    // 3. Call PhonePe Service
    const frontendUrl =
      process.env.PAYMENT_REDIRECT_BASE_URL ||
      "http://192.168.182.169:3001/payment"; // React App URL
    // The React app will handle status check at: /payment/status?merchantOrderId=...
    const redirectUrl = `${frontendUrl}/status?merchantOrderId=${merchantOrderId}&contestId=${contest._id}`;
    const callbackUrl = `${process.env.BACKEND_URL}/api/payment/callback`; // Server-to-server callback

    // User's snippet for params: merchantOrderId, amount (coins), mobile, redirect, callback
    const mobile = user.mobile || "9999999999"; // Fallback if user model doesn't have mobile

    const orderResponse = await phonePeService.createOrder(
      merchantOrderId,
      amountInPaise,
      mobile,
      redirectUrl,
      callbackUrl,
    );

    if (orderResponse.success && orderResponse.redirectUrl) {
      return res.status(200).json({
        success: true,
        redirectUrl: orderResponse.redirectUrl,
        merchantOrderId: merchantOrderId,
        paymentId: payment._id,
      });
    } else {
      throw new Error("Failed to get redirect URL from PhonePe");
    }
  } catch (err) {
    console.error("initiatePayment Error:", err);
    return res
      .status(500)
      .json({ message: "Payment initiation failed", error: err.message });
  }
};

// GET /api/payment/status
exports.getPaymentStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.query;
    if (!merchantOrderId)
      return res.status(400).json({ message: "merchantOrderId required" });

    const payment = await Payment.findOne({ merchantOrderId }).populate(
      "contestId",
    );
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // If already final, return
    if (["SUCCESS", "FAILED"].includes(payment.status)) {
      return res.status(200).json({
        success: true,
        status: payment.status,
        contestId: payment.contestId._id,
      });
    }

    // Check PhonePe
    const statusResult = await phonePeService.checkStatus(merchantOrderId);

    if (statusResult.state === "COMPLETED") {
      payment.status = "SUCCESS";
      payment.transactionId = statusResult.transactionId;
      payment.paidAt = new Date();
      await payment.save();

      // Update Participation
      await ContestParticipation.findByIdAndUpdate(payment.participationId, {
        isPaid: true,
        status: "REGISTERED",
        paidAt: new Date(),
        paymentId: payment._id,
      });
      await Contest.findByIdAndUpdate(payment.contestId, {
        $inc: { totalParticipants: 1 },
      });
    } else if (statusResult.state === "FAILED") {
      payment.status = "FAILED";
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      status: payment.status,
      contestId: payment.contestId._id,
    });
  } catch (err) {
    console.error("getPaymentStatus Error:", err);
    return res.status(500).json({ message: "Status check failed" });
  }
};

// POST /api/payment/callback (Webhook)
exports.handleCallback = async (req, res) => {
  // Handle server-to-server callback
  console.log("Payment Callback:", req.body);
  // Logic to verify checksum and update payment status
  res.status(200).send("OK");
};
