const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true,
  },
  firebaseUID: {
    type: String,
    required: true,
    unique: true,
  },
  profileImage: {
    type: String,
    default: '',
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest'
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
