const mongoose = require('mongoose');

const AvailabilitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  availabilityType: {
    type: String,
    enum: ['Available', 'Unavailable', 'Limited'],
    default: 'Available'
  },
  reason: {
    type: String,
    enum: ['Working Hours', 'Vacation', 'Sick Leave', 'Holiday', 'Training', 'Other'],
    default: 'Working Hours'
  },
  hoursPerDay: {
    type: Number,
    min: 0,
    max: 24,
    default: 8
  },
  notes: {
    type: String
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
AvailabilitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Availability', AvailabilitySchema);
