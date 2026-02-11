const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const verifyFirebaseToken = require("../middlewares/firebaseAuth");

// Protected Routes
router.post(
  "/initiate",
  verifyFirebaseToken,
  paymentController.initiatePayment,
);
router.get("/status", paymentController.getPaymentStatus); // Can be public or protected, normally public for React App access

router.post("/create-order", paymentController.createRazorpayOrder); // Public/Protected depending on flow, usually public if called from frontend with referenceId

router.post("/check-payment", paymentController.checkRazorpayPayment);

// Callback (Webhook)
router.post("/callback", paymentController.handleCallback);

module.exports = router;
