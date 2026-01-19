const Contest = require("../models/contest");
const ContestEntry = require("../models/contestEntry");
const ContestParticipation = require("../models/contestParticipation");
const User = require("../models/user");

// POST /api/contests/:contestID/upload-entry
exports.uploadEntry = async (req, res) => {
  try {
    const { contestID } = req.params;
    const firebaseUID = req.firebaseUID;

    if (!firebaseUID) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    const contest = await Contest.findById(contestID);
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    const participation = await ContestParticipation.findOne({
      userId: user._id,
      contestId: contest._id,
    });
    if (!participation)
      return res
        .status(400)
        .json({ message: "User is not registered for this contest" });
    if (!participation.isPaid)
      return res.status(400).json({ message: "Payment not completed" });

    // Collect uploaded files
    const images = [];
    if (req.files && req.files["images"]) {
      for (const f of req.files["images"])
        images.push(f.path || f.location || f.secure_url || f.url);
    }

    let videoUrl = null;
    if (req.files && req.files["video"] && req.files["video"][0]) {
      const v = req.files["video"][0];
      videoUrl = v.path || v.location || v.secure_url || v.url;
    }

    const bio = req.body.bio || "";

    // Check if entry already exists (Upsert logic)
    let entry = await ContestEntry.findOne({
      participationId: participation._id,
    });

    if (entry) {
      // Update existing entry
      if (images.length > 0) entry.images = images;
      if (videoUrl) entry.videoUrl = videoUrl;
      if (bio) entry.bio = bio;
      entry.isApproved = true; // Auto-approve updates for now
      entry.submittedAt = Date.now();
      await entry.save();
    } else {
      // Create new entry
      entry = await ContestEntry.create({
        participationId: participation._id,
        userId: user._id,
        contestId: contest._id,
        images,
        videoUrl,
        bio,
        isApproved: true,
      });
    }

    // Update participation status
    participation.status = "SUBMITTED";
    await participation.save();

    return res.status(200).json({ message: "Entry submitted", entry });
  } catch (err) {
    console.error("uploadEntry error", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/contests/my-entries
exports.getMyEntries = async (req, res) => {
  try {
    const firebaseUID = req.firebaseUID;
    if (!firebaseUID) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ firebaseUID });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find entries for this user
    const entries = await ContestEntry.find({ userId: user._id })
      .populate("contestId")
      .sort({ createdAt: -1 });

    const Vote = require("../models/Vote");
    const entriesWithVotes = await Promise.all(
      entries.map(async (e) => {
        const count = await Vote.countDocuments({ entryId: e._id });
        return { ...e.toObject(), totalVotes: count };
      }),
    );

    return res.status(200).json({ entries: entriesWithVotes });
  } catch (err) {
    console.error("getMyEntries error", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/contests/user/:userId/entries
exports.getUserEntries = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find entries for this specific user
    const entries = await ContestEntry.find({ userId })
      .populate("contestId")
      .sort({ createdAt: -1 });

    const Vote = require("../models/Vote");
    const entriesWithVotes = await Promise.all(
      entries.map(async (e) => {
        const count = await Vote.countDocuments({ entryId: e._id });
        return { ...e.toObject(), totalVotes: count };
      }),
    );

    return res.status(200).json({ entries: entriesWithVotes });
  } catch (err) {
    console.error("getUserEntries error", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// GET /api/contests/entries/:entryId
exports.getEntryById = async (req, res) => {
  try {
    const { entryId } = req.params;

    const entry = await ContestEntry.findByIdAndUpdate(
      entryId,
      { $inc: { views: 1 } },
      { new: true },
    )
      .populate("userId", "name profileImage")
      .populate("contestId", "name");
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    // Vote Logic
    let totalVotes = 0;
    try {
      const Vote = require("../models/Vote");
      totalVotes = await Vote.countDocuments({ entryId: entry._id });
    } catch (e) {
      console.error("Vote model error:", e);
    }

    let isVoted = false;
    let hasVotedInContest = false;
    let votedEntryDetails = null;

    // Safely check if user has voted
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        let admin;
        try {
          admin = require("../services/adminFirebase");
        } catch (e) {
          console.error("Admin require failed", e);
        }

        const jwt = require("jsonwebtoken");
        let decoded;

        if (admin && admin.auth) {
          try {
            decoded = await admin.auth().verifyIdToken(token);
          } catch (e) {
            console.error(
              "Firebase Token Verify Failed, trying JWT fallback:",
              e.message,
            );
            // FALLBACK for mobile/custom tokens
            try {
              decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || "dev-secret",
              );
            } catch (jwtErr) {
              console.error("JWT Fallback Failed:", jwtErr.message);
            }
          }

          if (decoded && (decoded.uid || decoded.user_id)) {
            const uid = decoded.uid || decoded.user_id;
            const user = await User.findOne({ firebaseUID: uid });
            if (user) {
              const contestObj = entry.contestId;
              const contestID =
                contestObj && contestObj._id ? contestObj._id : contestObj;

              if (contestID) {
                const Vote = require("../models/Vote");
                // Debug Log
                console.log(
                  `[getEntryById] User: ${user._id}, Contest: ${contestID}`,
                );

                const vote = await Vote.findOne({
                  voterId: user._id,
                  contestId: contestID,
                });
                console.log(
                  `[getEntryById] Vote Found:`,
                  vote ? vote._id : "null",
                );

                if (vote) {
                  hasVotedInContest = true;
                  if (vote.entryId.toString() === entry._id.toString()) {
                    isVoted = true;
                    console.log(`[getEntryById] isVoted = TRUE`);
                  } else {
                    console.log(
                      `[getEntryById] Voted for other: ${vote.entryId}`,
                    );
                    // Fetch who they voted for
                    const votedEntry = await ContestEntry.findById(
                      vote.entryId,
                    ).populate("userId", "name");
                    if (votedEntry) {
                      votedEntryDetails = {
                        _id: votedEntry._id.toString(),
                        name: votedEntry.userId
                          ? votedEntry.userId.name
                          : "Unknown Candidate",
                        image:
                          votedEntry.images && votedEntry.images.length > 0
                            ? votedEntry.images[0]
                            : null,
                      };
                      console.log(
                        "Sending votedEntryDetails:",
                        votedEntryDetails,
                      );
                    }
                  }
                }
              }
            } else {
              console.log("[getEntryById] User not found via firebaseUID");
            }
          }
        } else {
          console.log("[getEntryById] Admin Auth service unavailable");
        }
      }
    } catch (e) {
      console.error("Auth check error in getEntryById", e);
    }

    const entryObj = entry.toObject();
    entryObj.totalVotes = totalVotes;
    entryObj.isVoted = isVoted;
    entryObj.hasVotedInContest = hasVotedInContest;
    entryObj.votedEntryDetails = votedEntryDetails;

    return res.status(200).json({ entry: entryObj });
  } catch (err) {
    console.error("getEntryById CRITICAL error", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.toString() });
  }
};
