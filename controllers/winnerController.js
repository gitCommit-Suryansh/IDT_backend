const Contest = require("../models/contest");
const ContestEntry = require("../models/contestEntry");
const Vote = require("../models/Vote");
const ContestWinner = require("../models/ContestWinner");

// GET /api/contests/:contestID/potential-winners
exports.getPotentialWinners = async (req, res) => {
  try {
    const { contestID } = req.params;

    const contest = await Contest.findById(contestID);
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    // 1. Fetch all entries for this contest
    const entries = await ContestEntry.find({ contestId: contestID })
      .populate("userId", "name profileImage email")
      .lean();

    // 2. Calculate votes for each entry
    // Optimization: Depending on scale, we might want to do this via Aggregation Pipeline.
    // For now, mapping is fine for smaller scale.
    const results = await Promise.all(
      entries.map(async (entry) => {
        const voteCount = await Vote.countDocuments({ entryId: entry._id });
        return {
          ...entry,
          totalVotes: voteCount,
        };
      }),
    );

    // 3. Sort by votes descending
    results.sort((a, b) => b.totalVotes - a.totalVotes);

    // 4. Return Top 3
    const top3 = results.slice(0, 3);

    return res.status(200).json({ winners: top3 });
  } catch (err) {
    console.error("getPotentialWinners error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// POST /api/contests/:contestID/publish-winners
exports.publishWinners = async (req, res) => {
  try {
    const { contestID } = req.params;

    const contest = await Contest.findById(contestID);
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    if (contest.winnersAnnounced) {
      return res.status(400).json({ message: "Winners already announced" });
    }

    // Optional: Date Check (ensure we preserve the rule)
    if (
      contest.resultsAnnounceAt &&
      new Date() < new Date(contest.resultsAnnounceAt)
    ) {
      // Allow admin override? Or strictly enforce?
      // User requirement said: "only if current date is same or later"
      return res
        .status(400)
        .json({ message: "It is too early to announce results." });
    }

    // 1. Re-calculate Top 3 (Security measure)
    const entries = await ContestEntry.find({ contestId: contestID }).lean();
    const results = await Promise.all(
      entries.map(async (entry) => {
        const voteCount = await Vote.countDocuments({ entryId: entry._id });
        return {
          ...entry,
          totalVotes: voteCount,
        };
      }),
    );
    results.sort((a, b) => b.totalVotes - a.totalVotes);
    const top3 = results.slice(0, 3);

    if (top3.length === 0) {
      return res
        .status(400)
        .json({ message: "No entries found to pick winners from." });
    }

    // 2. Create ContestWinner records
    const winnerPromises = top3.map((winner, index) => {
      return ContestWinner.create({
        contestId: contestID,
        entryId: winner._id,
        userId: winner.userId, // ID reference
        rank: index + 1,
        votesAtWinTime: winner.totalVotes,
        announcedAt: new Date(),
      });
    });

    await Promise.all(winnerPromises);

    // 3. Update Contest status
    contest.winnersAnnounced = true;
    contest.winnersAnnouncedAt = new Date();
    await contest.save();

    return res
      .status(200)
      .json({ message: "Winners published successfully", winners: top3 });
  } catch (err) {
    console.error("publishWinners error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
