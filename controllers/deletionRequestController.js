const DeletionRequest = require("../models/DeletionRequest");

exports.createDeletionRequest = async (req, res) => {
  try {
    const { mobileNumber, reason, deletionType } = req.body;

    if (!mobileNumber || !reason || !deletionType) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newRequest = new DeletionRequest({
      mobileNumber,
      reason,
      deletionType,
    });

    await newRequest.save();

    res.status(201).json({
      message: "Deletion request submitted successfully.",
      deletionRequest: newRequest,
    });
  } catch (error) {
    console.error("Error creating deletion request:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

exports.getAllDeletionRequests = async (req, res) => {
  try {
    const requests = await DeletionRequest.find().sort({ createdAt: -1 });
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching deletion requests:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
