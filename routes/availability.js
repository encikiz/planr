const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Availability = require('../models/Availability');
const User = require('../models/User');
const Task = require('../models/Task');
const Workload = require('../models/Workload');

// @desc    Show availability dashboard
// @route   GET /availability
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get all users
    const users = await User.find({ isGuest: false }).lean();

    // Get date range (default to current month)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Format dates for the view
    const formattedStartDate = startOfMonth.toISOString().split('T')[0];
    const formattedEndDate = endOfMonth.toISOString().split('T')[0];

    // Get all availability records for the date range
    const availabilityRecords = await Availability.find({
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } },
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    })
      .populate('user', 'displayName firstName lastName image')
      .sort({ startDate: 1 })
      .lean();

    // Group availability by user
    const userAvailability = {};
    users.forEach(user => {
      userAvailability[user._id.toString()] = {
        user,
        records: []
      };
    });

    availabilityRecords.forEach(record => {
      const userId = record.user._id.toString();
      if (userAvailability[userId]) {
        userAvailability[userId].records.push(record);
      }
    });

    res.render('availability/index', {
      title: 'Resource Availability',
      userAvailability: Object.values(userAvailability),
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show my availability
// @route   GET /availability/my-availability
router.get('/my-availability', ensureAuth, async (req, res) => {
  try {
    // Get date range (default to current month)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get all availability records for the current user
    const availabilityRecords = await Availability.find({
      user: req.user.id,
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } },
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    }).sort({ startDate: 1 }).lean();

    // Get tasks assigned to the user
    const tasks = await Task.find({
      assignedTo: req.user.id,
      status: { $ne: 'Completed' }
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .lean();

    // Get workload assignments for the user
    const workloads = await Workload.find({
      user: req.user.id,
      status: { $ne: 'Completed' }
    })
      .populate('project', 'name')
      .sort({ startDate: 1 })
      .lean();

    res.render('availability/my-availability', {
      title: 'My Availability',
      availabilityRecords,
      tasks,
      workloads,
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Add availability record
// @route   POST /availability
router.post('/', ensureAuth, async (req, res) => {
  try {
    const {
      user,
      startDate,
      endDate,
      availabilityType,
      reason,
      hoursPerDay,
      notes
    } = req.body;

    // Create new availability record
    await Availability.create({
      user: user || req.user.id,
      startDate,
      endDate,
      availabilityType,
      reason,
      hoursPerDay,
      notes
    });

    res.redirect('/availability');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Update availability record
// @route   POST /availability/update/:id
router.post('/update/:id', ensureAuth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      availabilityType,
      reason,
      hoursPerDay,
      notes
    } = req.body;

    const availability = await Availability.findById(req.params.id);

    if (!availability) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Availability record not found' }
      });
    }

    // Check if the user is updating their own record or is an admin
    if (availability.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Not authorized to update this record' }
      });
    }

    // Update availability record
    availability.startDate = startDate;
    availability.endDate = endDate;
    availability.availabilityType = availabilityType;
    availability.reason = reason;
    availability.hoursPerDay = hoursPerDay;
    availability.notes = notes;

    await availability.save();

    res.redirect('/availability');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Delete availability record
// @route   POST /availability/delete/:id
router.post('/delete/:id', ensureAuth, async (req, res) => {
  try {
    const availability = await Availability.findById(req.params.id);

    if (!availability) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Availability record not found' }
      });
    }

    // Check if the user is deleting their own record or is an admin
    if (availability.user.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Not authorized to delete this record' }
      });
    }

    await Availability.findByIdAndDelete(req.params.id);
    res.redirect('/availability');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show user availability
// @route   GET /availability/user/:id
router.get('/user/:id', ensureAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user details
    const userDetails = await User.findById(userId).lean();

    if (!userDetails) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'User not found' }
      });
    }

    // Get date range (default to current month)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get all availability records for the user
    const availabilityRecords = await Availability.find({
      user: userId,
      $or: [
        { startDate: { $lte: endOfMonth }, endDate: { $gte: startOfMonth } },
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    }).sort({ startDate: 1 }).lean();

    // Get tasks assigned to the user
    const tasks = await Task.find({
      assignedTo: userId,
      status: { $ne: 'Completed' }
    })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .lean();

    // Get workload assignments for the user
    const workloads = await Workload.find({
      user: userId,
      status: { $ne: 'Completed' }
    })
      .populate('project', 'name')
      .sort({ startDate: 1 })
      .lean();

    res.render('availability/user', {
      title: `${userDetails.displayName}'s Availability`,
      userDetails,
      availabilityRecords,
      tasks,
      workloads,
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show resource allocation
// @route   GET /availability/allocation
router.get('/allocation', ensureAuth, async (req, res) => {
  try {
    // Get all users
    const users = await User.find({ isGuest: false }).lean();

    // Get all tasks with assignments
    const tasks = await Task.find({ assignedTo: { $ne: null } })
      .populate('assignedTo', 'displayName')
      .populate('project', 'name')
      .lean();

    // Get all workload assignments
    const workloads = await Workload.find({})
      .populate('user', 'displayName')
      .populate('project', 'name')
      .lean();

    // Calculate allocation by user
    const userAllocation = {};
    users.forEach(user => {
      userAllocation[user._id.toString()] = {
        user,
        totalEstimatedHours: 0,
        totalAllocatedDays: 0,
        projects: {},
        tasks: []
      };
    });

    // Add task allocations
    tasks.forEach(task => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        if (userAllocation[userId]) {
          userAllocation[userId].totalEstimatedHours += task.estimatedHours || 0;
          userAllocation[userId].tasks.push(task);

          // Group by project
          const projectId = task.project._id.toString();
          if (!userAllocation[userId].projects[projectId]) {
            userAllocation[userId].projects[projectId] = {
              project: task.project,
              estimatedHours: 0,
              allocatedDays: 0
            };
          }
          userAllocation[userId].projects[projectId].estimatedHours += task.estimatedHours || 0;
        }
      }
    });

    // Add workload allocations
    workloads.forEach(workload => {
      const userId = workload.user._id.toString();
      if (userAllocation[userId]) {
        userAllocation[userId].totalAllocatedDays += workload.daysAllocated || 0;

        // Group by project
        const projectId = workload.project._id.toString();
        if (!userAllocation[userId].projects[projectId]) {
          userAllocation[userId].projects[projectId] = {
            project: workload.project,
            estimatedHours: 0,
            allocatedDays: 0
          };
        }
        userAllocation[userId].projects[projectId].allocatedDays += workload.daysAllocated || 0;
      }
    });

    res.render('availability/allocation', {
      title: 'Resource Allocation',
      userAllocation: Object.values(userAllocation),
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

module.exports = router;
