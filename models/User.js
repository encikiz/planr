const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: false
  },
  displayName: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  image: {
    type: String
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['Team Member', 'Project Manager', 'Admin'],
    default: 'Team Member'
  },
  department: {
    type: String
  },
  skills: [{
    type: String
  }],
  defaultHoursPerDay: {
    type: Number,
    default: 8,
    min: 0,
    max: 24
  },
  maxUtilizationPercentage: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
