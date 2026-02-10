const mongoose = require("mongoose");

const deletionRequestSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    deletionType: {
      type: String,
      enum: ["Full Account", "Media Data", "Other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("DeletionRequest", deletionRequestSchema);
