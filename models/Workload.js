const mongoose = require('mongoose');

const WorkloadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
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
  daysAllocated: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Planned', 'In Progress', 'Completed', 'Delayed'],
    default: 'Planned'
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

// Calculate days between start and end dates
WorkloadSchema.pre('save', function(next) {
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  
  // Calculate the difference in milliseconds
  const diffTime = Math.abs(endDate - startDate);
  
  // Convert to days (including weekends)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  this.daysAllocated = diffDays;
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('Workload', WorkloadSchema);
