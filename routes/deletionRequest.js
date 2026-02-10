const express = require("express");
const router = express.Router();
const deletionRequestController = require("../controllers/deletionRequestController");

// POST /api/deletion-requests
router.post("/", deletionRequestController.createDeletionRequest);

// GET /api/deletion-requests (Optional: for admin viewing)
router.get("/", deletionRequestController.getAllDeletionRequests);

module.exports = router;
