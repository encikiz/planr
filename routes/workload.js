const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Workload = require('../models/Workload');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Show workload dashboard
// @route   GET /workload
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get all workloads for the current user or all workloads if admin
    const workloads = await Workload.find({})
      .populate('user', 'displayName firstName lastName image')
      .populate('project', 'name status team')
      .sort({ startDate: 1 })
      .lean();

    // Get all projects for the form
    const projects = await Project.find({
      status: { $ne: 'Completed' }
    }).lean();

    // Get all team members
    const users = await User.find({
      isGuest: false
    }).lean();

    res.render('workload/index', {
      title: 'Workload Tracking',
      workloads,
      projects,
      users,
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

// @desc    Add workload assignment
// @route   POST /workload
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { project, user, startDate, endDate, status, notes } = req.body;
    
    // Create new workload
    await Workload.create({
      project,
      user: user || req.user.id, // If no user specified, assign to current user
      startDate,
      endDate,
      status,
      notes
    });
    
    res.redirect('/workload');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show edit workload form
// @route   GET /workload/edit/:id
router.get('/edit/:id', ensureAuth, async (req, res) => {
  try {
    const workload = await Workload.findById(req.params.id)
      .populate('user', 'displayName')
      .populate('project', 'name')
      .lean();
    
    if (!workload) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Workload not found' }
      });
    }
    
    // Get all projects for the form
    const projects = await Project.find({
      status: { $ne: 'Completed' }
    }).lean();

    // Get all team members
    const users = await User.find({
      isGuest: false
    }).lean();
    
    res.render('workload/edit', {
      title: 'Edit Workload',
      workload,
      projects,
      users,
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

// @desc    Update workload
// @route   PUT /workload/:id
router.post('/update/:id', ensureAuth, async (req, res) => {
  try {
    const { project, user, startDate, endDate, status, notes } = req.body;
    
    const workload = await Workload.findById(req.params.id);
    
    if (!workload) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Workload not found' }
      });
    }
    
    // Update workload
    workload.project = project;
    workload.user = user;
    workload.startDate = startDate;
    workload.endDate = endDate;
    workload.status = status;
    workload.notes = notes;
    
    await workload.save();
    
    res.redirect('/workload');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Delete workload
// @route   DELETE /workload/:id
router.post('/delete/:id', ensureAuth, async (req, res) => {
  try {
    await Workload.findByIdAndDelete(req.params.id);
    res.redirect('/workload');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show user workload
// @route   GET /workload/user/:id
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
    
    // Get all workloads for this user
    const workloads = await Workload.find({ user: userId })
      .populate('project', 'name status team')
      .sort({ startDate: 1 })
      .lean();
    
    // Calculate total days allocated
    const totalDays = workloads.reduce((total, workload) => total + workload.daysAllocated, 0);
    
    // Group by project
    const projectWorkloads = {};
    workloads.forEach(workload => {
      const projectId = workload.project._id.toString();
      if (!projectWorkloads[projectId]) {
        projectWorkloads[projectId] = {
          project: workload.project,
          totalDays: 0,
          workloads: []
        };
      }
      projectWorkloads[projectId].totalDays += workload.daysAllocated;
      projectWorkloads[projectId].workloads.push(workload);
    });
    
    res.render('workload/user', {
      title: `${userDetails.displayName}'s Workload`,
      userDetails,
      workloads,
      totalDays,
      projectWorkloads: Object.values(projectWorkloads),
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

// @desc    Show project workload
// @route   GET /workload/project/:id
router.get('/project/:id', ensureAuth, async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get project details
    const projectDetails = await Project.findById(projectId).lean();
    
    if (!projectDetails) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Project not found' }
      });
    }
    
    // Get all workloads for this project
    const workloads = await Workload.find({ project: projectId })
      .populate('user', 'displayName firstName lastName image')
      .sort({ startDate: 1 })
      .lean();
    
    // Calculate total days allocated
    const totalDays = workloads.reduce((total, workload) => total + workload.daysAllocated, 0);
    
    // Group by user
    const userWorkloads = {};
    workloads.forEach(workload => {
      const userId = workload.user._id.toString();
      if (!userWorkloads[userId]) {
        userWorkloads[userId] = {
          user: workload.user,
          totalDays: 0,
          workloads: []
        };
      }
      userWorkloads[userId].totalDays += workload.daysAllocated;
      userWorkloads[userId].workloads.push(workload);
    });
    
    res.render('workload/project', {
      title: `${projectDetails.name} Workload`,
      projectDetails,
      workloads,
      totalDays,
      userWorkloads: Object.values(userWorkloads),
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
