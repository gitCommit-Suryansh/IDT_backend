const Vote = require('../models/Vote');
const Contest = require('../models/contest');
const ContestEntry = require('../models/contestEntry');
const User = require('../models/user');

// POST /api/contests/:contestID/vote
exports.voteForEntry = async (req, res) => {
  try {
    const { contestID } = req.params;
    const { entryId } = req.body;
    const firebaseUID = req.firebaseUID;

    if (!firebaseUID) return res.status(401).json({ message: 'Unauthorized' });
    if (!entryId) return res.status(400).json({ message: 'entryId required' });

    const user = await User.findOne({ firebaseUID });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const contest = await Contest.findById(contestID);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });

    const entry = await ContestEntry.findById(entryId);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    if (String(entry.contestId) !== String(contest._id)) return res.status(400).json({ message: 'Entry does not belong to contest' });

    // Check if user already voted in this contest
    const existing = await Vote.findOne({ voterId: user._id, contestId: contest._id });
    if (existing) return res.status(400).json({ message: 'User has already voted for this contest' });

    const vote = await Vote.create({ contestId: contest._id, entryId: entry._id, voterId: user._id });

    // Increment contest totalVotes
    await Contest.findByIdAndUpdate(contest._id, { $inc: { totalVotes: 1 } });

    return res.status(201).json({ message: 'Vote recorded', vote });
  } catch (err) {
    console.error('voteForEntry error', err);
    // handle duplicate key (unique index) from DB
    if (err && err.code === 11000) {
      return res.status(400).json({ message: 'User has already voted for this contest' });
    }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
