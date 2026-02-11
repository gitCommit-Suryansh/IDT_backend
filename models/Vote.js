// models/Vote.js
const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContestEntry",
      required: true,
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * One vote per user per contest
 */
voteSchema.index({ voterId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
