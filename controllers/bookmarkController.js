const User = require('../models/user');
const Contest = require('../models/contest');

// POST /bookmark/:contestId
exports.toggleBookmark = async (req, res) => {
    try {
        const { contestId } = req.params;
        const { firebaseUID } = req; // Assuming from middleware

        const user = await User.findOne({ firebaseUID });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check if contest exists
        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).json({ message: 'Contest not found' });

        // Check if already bookmarked
        const index = user.bookmarks.indexOf(contestId);
        let isBookmarked = false;

        if (index === -1) {
            // Add
            user.bookmarks.push(contestId);
            isBookmarked = true;
        } else {
            // Remove
            user.bookmarks.splice(index, 1);
            isBookmarked = false;
        }

        await user.save();

        return res.status(200).json({
            message: isBookmarked ? 'Bookmark added' : 'Bookmark removed',
            isBookmarked
        });

    } catch (error) {
        console.error('Bookmark error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// GET /bookmarks
exports.getBookmarkedContests = async (req, res) => {
    try {
        const { firebaseUID } = req;
        const user = await User.findOne({ firebaseUID }).populate('bookmarks');

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({
            bookmarks: user.bookmarks
        });

    } catch (error) {
        console.error('Get bookmarks error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
