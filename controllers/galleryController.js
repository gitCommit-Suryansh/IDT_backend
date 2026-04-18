const Gallery = require("../models/gallery");

exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images provided." });
    }

    const newDocs = [];
    for (const f of req.files) {
      const imageUrl = f.path || f.location || f.secure_url || f.url;
      if (imageUrl) {
        newDocs.push({ imageUrl });
      }
    }

    const inserted = await Gallery.insertMany(newDocs);
    return res.status(201).json({ message: "Images uploaded successfully", data: inserted });
  } catch (err) {
    console.error("uploadImages error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getGallery = async (req, res) => {
  try {
    // Fetch all gallery images, sorted by newest first
    const images = await Gallery.find().sort({ uploadedAt: -1 });
    return res.status(200).json({ images });
  } catch (err) {
    console.error("getGallery error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Gallery.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Image not found." });
    return res.status(200).json({ message: "Image deleted successfully." });
  } catch (err) {
    console.error("deleteImage error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
