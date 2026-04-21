// models/ContestParticipation.js
const mongoose = require("mongoose");

const contestParticipationSchema = new mongoose.Schema(
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

    // PAYMENT
    isPaid: { type: Boolean, default: false },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    // Legacy/Mock fields (can be deprecated)
    paymentAmount: { type: Number },
    paymentMethod: { type: String },
    paidAt: { type: Date },

    // STATUS
    status: {
      type: String,
      enum: ["REGISTERED", "SUBMITTED", "DISQUALIFIED"],
      default: "REGISTERED",
    },
  },
  { timestamps: { currentTime: () => new Date(Date.now() + 5.5 * 60 * 60 * 1000) } },
);

/**
 * One user can participate only once per contest
 */
contestParticipationSchema.index({ userId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model(
  "ContestParticipation",
  contestParticipationSchema,
);
