const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Show all milestones
// @route   GET /milestones
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get the selected project filter (if any)
    const selectedProject = req.query.project || 'all';

    // Build query based on selected project
    let query = {};
    if (selectedProject !== 'all') {
      query.project = selectedProject;
    }

    // Get all milestones based on query
    const milestones = await Milestone.find(query)
      .populate('project', 'name')
      .populate('owner', 'displayName image')
      .sort({ date: 1 })
      .lean();

    // Get upcoming milestones (not completed)
    const upcomingMilestones = await Milestone.find({ status: { $ne: 'Completed' } })
      .populate('project', 'name')
      .populate('owner', 'displayName image')
      .sort({ date: 1 })
      .lean();

    // Get all projects for the filter
    const projects = await Project.find({})
      .select('name')
      .lean();

    res.render('milestones/index', {
      title: 'Milestones',
      milestones,
      upcomingMilestones,
      projects,
      selectedProject,
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

// @desc    Show add milestone form
// @route   GET /milestones/add
router.get('/add', ensureAuth, async (req, res) => {
  try {
    // Get all projects for the form
    const projects = await Project.find({})
      .select('name')
      .lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false })
      .lean();

    res.render('milestones/add', {
      title: 'Add Milestone',
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

// @desc    Process add milestone form
// @route   POST /milestones
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { title, description, project, owner, date, status } = req.body;

    // Create new milestone
    await Milestone.create({
      title,
      description,
      project,
      owner: owner || null,
      date,
      status,
      createdBy: req.user._id
    });

    res.redirect('/milestones');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show milestone details
// @route   GET /milestones/:id
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('project', 'name')
      .populate('owner', 'displayName image')
      .populate({
        path: 'comments.user',
        select: 'displayName image'
      })
      .lean();

    if (!milestone) {
      return res.status(404).render('404', {
        title: 'Milestone Not Found',
        layout: 'layouts/main'
      });
    }

    res.render('milestones/detail', {
      title: milestone.title,
      milestone,
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

// @desc    Show edit milestone form
// @route   GET /milestones/edit/:id
router.get('/edit/:id', ensureAuth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id).lean();

    if (!milestone) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Milestone not found' }
      });
    }

    // Get all projects for the form
    const projects = await Project.find({})
      .select('name')
      .lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false })
      .lean();

    res.render('milestones/edit', {
      title: 'Edit Milestone',
      milestone,
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

// @desc    Update milestone
// @route   POST /milestones/update/:id
router.post('/update/:id', ensureAuth, async (req, res) => {
  try {
    const { title, description, project, owner, date, status } = req.body;

    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Milestone not found' }
      });
    }

    // Update milestone
    milestone.title = title;
    milestone.description = description;
    milestone.project = project;
    milestone.owner = owner || null;
    milestone.date = date;
    milestone.status = status;

    await milestone.save();

    res.redirect(`/milestones/${milestone._id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Delete milestone
// @route   POST /milestones/delete/:id
router.post('/delete/:id', ensureAuth, async (req, res) => {
  try {
    await Milestone.findByIdAndDelete(req.params.id);
    res.redirect('/milestones');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Update milestone status
// @route   POST /milestones/:id/status
router.post('/:id/status', ensureAuth, async (req, res) => {
  try {
    const { status } = req.body;

    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Milestone not found' }
      });
    }

    // Update milestone status
    milestone.status = status;
    await milestone.save();

    res.redirect(`/milestones/${milestone._id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Add comment to milestone
// @route   POST /milestones/:id/comment
router.post('/:id/comment', ensureAuth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.redirect(`/milestones/${req.params.id}`);
    }

    const milestone = await Milestone.findById(req.params.id);

    if (!milestone) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Milestone not found' }
      });
    }

    // Add comment
    milestone.comments.push({
      user: req.user._id,
      text
    });

    await milestone.save();

    res.redirect(`/milestones/${milestone._id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

module.exports = router;
