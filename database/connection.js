const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Mongoose 6+ ignores useNewUrlParser/useUnifiedTopology but passing them is harmless.
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        // rethrow so caller can handle or the process can exit if desired
        throw error;
    }
};

module.exports = connectDB;