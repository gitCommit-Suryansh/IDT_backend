// middleware/verifyFirebaseToken.js

const admin = require("../services/adminFirebase");
const jwt = require("jsonwebtoken");

const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    // Try verifying as Firebase ID Token
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUID = decoded.uid;
    next();
  } catch (err) {
    console.error("Firebase ID Token verification failed:", err.message);
    // Fallback: Try verifying as Custom JWT (for Mobile Login)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.firebaseUID = decoded.uid;
      next();
    } catch (jwtErr) {
      console.error("JWT verification failed:", jwtErr.message);
      return res.status(403).json({ message: "Invalid token" });
    }
  }
};

module.exports = verifyFirebaseToken;
