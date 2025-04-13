const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Show all tasks
// @route   GET /tasks
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get all tasks
    const tasks = await Task.find({})
      .populate('project', 'name status')
      .populate('assignedTo', 'displayName image')
      .populate('createdBy', 'displayName')
      .sort({ createdAt: -1 })
      .lean();

    // Get all projects for the form
    const projects = await Project.find({}).lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false }).lean();

    res.render('tasks/index', {
      title: 'Tasks',
      tasks,
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

// @desc    Show add task form
// @route   GET /tasks/add
router.get('/add', ensureAuth, async (req, res) => {
  try {
    // Get all projects for the form
    const projects = await Project.find({}).lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false }).lean();

    res.render('tasks/add', {
      title: 'Add Task',
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

// @desc    Process add task form
// @route   POST /tasks
router.post('/', ensureAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      status,
      priority,
      startDate,
      dueDate,
      estimatedHours,
      skills
    } = req.body;

    // Process skills array
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];

    // Create new task
    await Task.create({
      title,
      description,
      project,
      assignedTo: assignedTo || null,
      status,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || null,
      skills: skillsArray,
      createdBy: req.user.id
    });

    res.redirect('/tasks');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show edit task form
// @route   GET /tasks/edit/:id
router.get('/edit/:id', ensureAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();

    if (!task) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Task not found' }
      });
    }

    // Get all projects for the form
    const projects = await Project.find({}).lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false }).lean();

    res.render('tasks/edit', {
      title: 'Edit Task',
      task,
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

// @desc    Update task
// @route   PUT /tasks/:id
router.post('/update/:id', ensureAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      status,
      priority,
      startDate,
      dueDate,
      estimatedHours,
      actualHours,
      skills
    } = req.body;

    // Process skills array
    const skillsArray = skills ? skills.split(',').map(skill => skill.trim()) : [];

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Task not found' }
      });
    }

    // Update task
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (project) task.project = project;
    task.assignedTo = assignedTo || task.assignedTo || null;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (startDate) task.startDate = startDate;
    if (dueDate) task.dueDate = dueDate;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours || null;
    if (actualHours !== undefined) task.actualHours = actualHours || 0;
    if (skills) task.skills = skillsArray;

    await task.save();

    // Check if we should redirect back to the project page
    const redirectUrl = req.query.redirect ? req.query.redirect : '/tasks';
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Delete task
// @route   DELETE /tasks/:id
router.post('/delete/:id', ensureAuth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    const projectId = task ? task.project : null;

    await Task.findByIdAndDelete(req.params.id);

    // Check if we should redirect back to the project page
    const redirectUrl = req.query.redirect ? req.query.redirect :
                        (projectId ? `/projects/${projectId}` : '/tasks');
    res.redirect(redirectUrl);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Show my tasks
// @route   GET /tasks/my-tasks
router.get('/my-tasks', ensureAuth, async (req, res) => {
  try {
    // Get all tasks assigned to the current user
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('project', 'name status')
      .populate('createdBy', 'displayName')
      .sort({ dueDate: 1 })
      .lean();

    res.render('tasks/my-tasks', {
      title: 'My Tasks',
      tasks,
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

// @desc    Show project tasks
// @route   GET /tasks/project/:id
router.get('/project/:id', ensureAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Get project details
    const project = await Project.findById(projectId).lean();

    if (!project) {
      return res.render('error', {
        title: 'Error',
        error: { message: 'Project not found' }
      });
    }

    // Get all tasks for this project
    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'displayName image')
      .populate('createdBy', 'displayName')
      .sort({ createdAt: -1 })
      .lean();

    // Get all users for assignment
    const users = await User.find({ isGuest: false }).lean();

    res.render('tasks/project', {
      title: `${project.name} Tasks`,
      project,
      tasks,
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

module.exports = router;
