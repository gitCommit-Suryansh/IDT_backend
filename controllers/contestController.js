const Contest = require("../models/contest");
const ContestParticipation = require("../models/contestParticipation");
const ContestWinner = require("../models/ContestWinner");

// POST /api/contest/create
exports.createContest = async (req, res) => {
  try {
    const {
      name,
      theme,
      description,
      entryFee,
      prizePool,
      firstPrize,
      secondPrize,
      thirdPrize,
      celebrityName,

      registrationStartAt,
      registrationEndAt,
      votingEndAt,
      winnersAnnouncedAt, // optional
      resultsAnnounceAt,
    } = req.body;

    if (
      !name ||
      !theme ||
      !description ||
      entryFee === undefined ||
      prizePool === undefined ||
      firstPrize === undefined ||
      secondPrize === undefined ||
      thirdPrize === undefined ||
      !registrationStartAt ||
      !registrationEndAt ||
      !votingEndAt
    ) {
      return res.status(400).json({
        message: "All required fields must be filled",
      });
    }

    const parseUTC = (d) => d ? new Date(d.endsWith('Z') || d.includes('+') ? d : d + 'Z') : null;

    const regStart = parseUTC(registrationStartAt);
    const regEnd = parseUTC(registrationEndAt);

    // Voting starts IMMEDIATELY when registration starts
    const voteStart = regStart;
    const voteEnd = parseUTC(votingEndAt);

    const winnersAnnounceDate = parseUTC(winnersAnnouncedAt);
    const resultsAnnounceDate = parseUTC(resultsAnnounceAt);

    if (isNaN(regStart) || isNaN(regEnd) || isNaN(voteEnd)) {
      return res.status(400).json({
        message: "Invalid date format",
      });
    }

    if (regStart >= regEnd) {
      return res.status(400).json({
        message: "Registration end date must be after registration start date",
      });
    }

    if (voteEnd <= voteStart) {
      return res.status(400).json({
        message: "Voting end date must be after voting start date",
      });
    }

    // Registration CAN end before voting (allowed)
    if (regEnd > voteEnd) {
      return res.status(400).json({
        message: "Registration cannot end after voting ends",
      });
    }

    const imageUrl = req.file?.path;
    if (!imageUrl) {
      return res.status(400).json({
        message: "Banner image is required",
      });
    }

    const contest = new Contest({
      name,
      theme,
      description,
      entryFee,
      prizePool,
      firstPrize,
      secondPrize,
      thirdPrize,
      celebrityName,

      bannerImage: imageUrl,

      registrationStartAt: regStart,
      registrationEndAt: regEnd,

      votingStartAt: voteStart,
      votingEndAt: voteEnd,

      winnersAnnounced: false,
      winnersAnnouncedAt: winnersAnnounceDate,
      resultsAnnounceAt: resultsAnnounceDate,

      isActive: true,
    });

    await contest.save();

    return res.status(201).json({
      message: "Contest created successfully",
      contest,
    });
  } catch (err) {
    console.error("Error creating contest:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

// GET /api/contests/all
exports.getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find().sort({ createdAt: -1 });

    // Attach participant count to each contest
    const contestsWithCount = await Promise.all(
      contests.map(async (c) => {
        const count = await ContestParticipation.countDocuments({
          contestId: c._id,
          isPaid: true,
        });
        const cObj = c.toObject();
        cObj.totalParticipants = count;
        return cObj;
      }),
    );

    res.status(200).json({ contests: contestsWithCount });
  } catch (err) {
    console.error("Error fetching contests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/contest/:contestID
exports.getContestById = async (req, res) => {
  const contestId = req.params.contestID;
  try {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // Get real participant count dynamically
    const realCount = await ContestParticipation.countDocuments({
      contestId: contest._id,
      isPaid: true,
    });

    const contestObj = contest.toObject();
    contestObj.totalParticipants = realCount;

    // ...

    // Attach winners if announced
    if (contest.winnersAnnounced) {
      try {
        const winners = await ContestWinner.find({ contestId: contest._id })
          .populate("userId", "name profileImage")
          .sort({ rank: 1 });

        console.log(
          `[getContestById] Contest ${contest._id} announced. Found ${winners.length} winners.`,
        );
        contestObj.winners = winners;
      } catch (wErr) {
        console.error("Error fetching winners for contest:", wErr);
      }
    }

    return res
      .status(200)
      .json({ message: "Contest fetched successfully", contest: contestObj });
  } catch (err) {
    console.error("Error fetching contest:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/contest/:contestID/update
exports.updateContest = async (req, res) => {
  const contestId = req.params.contestID;
  try {
    const { name, prizePool, firstPrize, secondPrize, thirdPrize, registrationStartAt, registrationEndAt, votingEndAt, resultsAnnounceAt } = req.body;

    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    if (name) contest.name = name;
    if (prizePool !== undefined) contest.prizePool = prizePool;
    if (firstPrize !== undefined) contest.firstPrize = firstPrize;
    if (secondPrize !== undefined) contest.secondPrize = secondPrize;
    if (thirdPrize !== undefined) contest.thirdPrize = thirdPrize;

    const parseUTC = (d) => d ? new Date(d.endsWith('Z') || d.includes('+') ? d : d + 'Z') : null;

    if (registrationStartAt) {
      const regStart = parseUTC(registrationStartAt);
      if (isNaN(regStart)) return res.status(400).json({ message: "Invalid registrationStartAt date format" });
      contest.registrationStartAt = regStart;
    }

    if (registrationEndAt) {
      const regEnd = parseUTC(registrationEndAt);
      if (isNaN(regEnd)) return res.status(400).json({ message: "Invalid registrationEndAt date format" });
      if (regEnd <= contest.registrationStartAt) {
        return res.status(400).json({ message: "Registration end date must be after registration start date" });
      }
      contest.registrationEndAt = regEnd;
    }

    if (votingEndAt) {
      const voteEnd = parseUTC(votingEndAt);
      if (isNaN(voteEnd)) return res.status(400).json({ message: "Invalid votingEndAt date format" });
      if (voteEnd <= contest.votingStartAt) {
        return res.status(400).json({ message: "Support end date must be after support start date" });
      }
      contest.votingEndAt = voteEnd;
    }
    
    // Safety check matching create constraint
    if (contest.registrationEndAt > contest.votingEndAt) {
      return res.status(400).json({ message: "Registration cannot end after support ends" });
    }

    if (resultsAnnounceAt !== undefined) {
      // Allow clearing it if falsy, otherwise parse date
      const announceDate = parseUTC(resultsAnnounceAt);
      if (announceDate && isNaN(announceDate)) return res.status(400).json({ message: "Invalid resultsAnnounceAt date format" });
      contest.resultsAnnounceAt = announceDate;
    }

    if (req.file && req.file.path) {
      contest.bannerImage = req.file.path;
    }

    await contest.save();

    return res.status(200).json({
      message: "Contest updated successfully",
      contest
    });

  } catch (err) {
    console.error("Error updating contest:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
