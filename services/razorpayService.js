const Razorpay = require("razorpay");
const crypto = require("crypto");

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SDY0ZmFba9Qjv1",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "jErASecbZUrCgMHupfJsFJ6t",
});

exports.createOrder = async (amount, currency, receipt, notes) => {
  try {
    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: currency,
      receipt: receipt,
      notes: notes,
    };

    const order = await instance.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    throw error;
  }
};

exports.verifySignature = (
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
) => {
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_KEY_SECRET || "jErASecbZUrCgMHupfJsFJ6t",
    )
    .update(body.toString())
    .digest("hex");

  return expectedSignature === razorpaySignature;
};

exports.fetchPayment = async (paymentId) => {
  try {
    const payment = await instance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error("Razorpay Fetch Payment Error:", error);
    throw error;
  }
};

exports.fetchOrder = async (orderId) => {
  try {
    const order = await instance.orders.fetch(orderId);
    return order;
  } catch (error) {
    console.error("Razorpay Fetch Order Error:", error);
    throw error;
  }
};

exports.getKeyId = () => {
  return process.env.RAZORPAY_KEY_ID || "rzp_test_SDY0ZmFba9Qjv1";
};
