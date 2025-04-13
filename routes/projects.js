const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Project = require('../models/Project');
const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');

// Helper function to calculate time progress
const calculateTimeProgress = (project) => {
  // Current date
  const currentDate = new Date();

  // Project start date (use createdAt if no explicit start date)
  const startDate = project.startDate ? new Date(project.startDate) : new Date(project.createdAt);

  // Project due date
  const dueDate = project.dueDate ? new Date(project.dueDate) : new Date();

  // Calculate total project duration in days
  const totalDuration = Math.floor((dueDate - startDate) / (1000 * 60 * 60 * 24));

  // Calculate elapsed time in days
  const elapsedTime = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));

  // Calculate time progress percentage
  let timeProgress = Math.floor((elapsedTime / totalDuration) * 100);

  // Ensure progress is between 0 and 100
  timeProgress = Math.max(0, Math.min(100, timeProgress));

  // Calculate days remaining
  const daysRemaining = Math.max(0, Math.floor((dueDate - currentDate) / (1000 * 60 * 60 * 24)));

  return {
    timeProgress,
    daysRemaining,
    totalDuration
  };
};

// Projects routes
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get filter/sort parameters from query string, providing defaults
    const { status = 'all', team = 'all', sort = 'newest' } = req.query;

    // Build query based on filters
    let query = {};
    if (status !== 'all') {
      query.status = status;
    }
    if (team !== 'all') {
      query.team = team;
    }

    // Get all projects with the query
    let projects = await Project.find(query)
      .populate('members', 'displayName firstName lastName image')
      .populate('createdBy', 'displayName')
      .lean();

    // Sort projects
    projects.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return b.progress - a.progress; // Higher progress first
        case 'dueDate':
          // Handle potential invalid dates during comparison
          const dateA = a.dueDate ? new Date(a.dueDate) : null;
          const dateB = b.dueDate ? new Date(b.dueDate) : null;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // Invalid dates go last
          if (!dateB) return -1;
          return dateA - dateB; // Earlier due dates first
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    // Add timeline progress to the projects
    const projectsToRender = projects.map(project => {
      const timeData = calculateTimeProgress(project);
      return {
        ...project,
        timeProgress: timeData.timeProgress,
        daysRemaining: timeData.daysRemaining,
        totalDuration: timeData.totalDuration
      };
    });

    // Get all teams for the filter dropdown
    const teams = await Team.find({}).select('name').lean();
    const uniqueTeams = teams.map(t => t.name);

    // Store current filters to pass to the view
    const currentFilters = { status, team, sort };

    res.render('projects/index', {
      title: 'Projects',
      projects: projectsToRender,
      teams: uniqueTeams,
      filters: currentFilters,
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

// Route to display the new project form
router.get('/new', ensureAuth, async (req, res) => {
  try {
    // Get all teams for the form
    const teams = await Team.find({}).select('name').lean();

    // Get all users for the form
    const users = await User.find({ isGuest: false }).lean();

    res.render('projects/new', {
      title: 'Create New Project',
      teams: teams,
      users: users,
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

// Route to display project details
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    // Get project by ID
    const project = await Project.findById(req.params.id)
      .populate('members', 'displayName firstName lastName image')
      .populate('createdBy', 'displayName')
      .lean()

    // Get tasks for this project
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', 'displayName image')
      .sort({ createdAt: -1 })
      .lean();

    if (!project) {
      return res.status(404).render('404', {
        title: 'Project Not Found',
        layout: 'layouts/main'
      });
    }

    // Add timeline progress data
    const timeData = calculateTimeProgress(project);
    const projectWithTimeProgress = {
      ...project,
      timeProgress: timeData.timeProgress,
      daysRemaining: timeData.daysRemaining,
      totalDuration: timeData.totalDuration
    };

    // Get additional task details for Gantt chart

    // Format tasks for Gantt chart
    const formattedTasks = tasks.map(task => ({
      id: task._id,
      name: task.title,
      startDate: task.startDate || project.createdAt,
      endDate: task.dueDate || project.dueDate,
      progress: task.status === 'Completed' ? 100 :
                task.status === 'In Progress' ? 50 :
                task.status === 'On Hold' ? 25 : 0,
      status: task.status,
      assignee: task.assignedTo ? task.assignedTo.displayName : 'Unassigned'
    }));

    // Get all users for adding team members
    const users = await User.find({ isGuest: false }).lean();

    // Get the team details
    const team = await Team.findOne({ name: project.team }).lean();

    res.render('projects/detail', {
      title: project.name,
      project: projectWithTimeProgress,
      tasks: tasks,                // Raw task data for the task list
      formattedTasks: formattedTasks, // Formatted tasks for the Gantt chart
      users: users,
      team: team,
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

// DELETE route to handle project deletion
router.delete('/:id', ensureAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    console.log(`Attempting to delete project with ID: ${projectId}`);

    // Find the project to check if it exists
    const project = await Project.findById(projectId);

    if (!project) {
      console.error(`Project with ID ${projectId} not found for deletion.`);
      return res.redirect('/projects');
    }

    // Delete all tasks associated with this project
    const tasksDeleted = await Task.deleteMany({ project: projectId });
    console.log(`Deleted ${tasksDeleted.deletedCount} tasks associated with project ${projectId}`);

    // Delete the project
    await Project.findByIdAndDelete(projectId);
    console.log(`Project with ID ${projectId} deleted successfully.`);

    // Redirect back to the projects list
    return res.redirect('/projects');
  } catch (err) {
    console.error('Error deleting project:', err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// Alternative route for project deletion (POST with _method=DELETE)
router.post('/:id/delete', ensureAuth, async (req, res) => {
  try {
    const projectId = req.params.id;

    console.log(`Attempting to delete project with ID (via POST): ${projectId}`);

    // Find the project to check if it exists
    const project = await Project.findById(projectId);

    if (!project) {
      console.error(`Project with ID ${projectId} not found for deletion.`);
      return res.redirect('/projects');
    }

    // Delete all tasks associated with this project
    const tasksDeleted = await Task.deleteMany({ project: projectId });
    console.log(`Deleted ${tasksDeleted.deletedCount} tasks associated with project ${projectId}`);

    // Delete the project
    await Project.findByIdAndDelete(projectId);
    console.log(`Project with ID ${projectId} deleted successfully.`);

    // Redirect back to the projects list
    return res.redirect('/projects');
  } catch (err) {
    console.error('Error deleting project:', err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// POST route to handle new project creation
router.post('/', ensureAuth, async (req, res) => {
  try {
    // Basic validation
    const { name, description, status, team, dueDate, members } = req.body;
    if (!name || !description || !status || !team || !dueDate) {
      return res.render('projects/new', {
        title: 'Create New Project',
        error: 'Please fill in all required fields',
        teams: await Team.find({}).select('name').lean(),
        users: await User.find({ isGuest: false }).lean(),
        user: req.user
      });
    }

    // Process members (convert to array if single value)
    const memberIds = Array.isArray(members) ? members : members ? [members] : [];

    // Create new project
    const newProject = await Project.create({
      name,
      description,
      status,
      team,
      progress: 0, // New projects start at 0%
      dueDate,
      members: memberIds,
      createdBy: req.user._id
    });

    console.log('New project added:', newProject);

    // Redirect back to the projects list
    res.redirect('/projects');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// GET route to show edit project form
router.get('/:id/edit', ensureAuth, async (req, res) => {
  try {
    // Get project by ID
    const project = await Project.findById(req.params.id).lean();

    if (!project) {
      return res.status(404).render('404', {
        title: 'Project Not Found',
        layout: 'layouts/main'
      });
    }

    // Get all teams for the form
    const teams = await Team.find({}).select('name').lean();

    // Get all users for the form
    const users = await User.find({ isGuest: false }).lean();

    res.render('projects/edit', {
      title: `Edit ${project.name}`,
      project,
      teams,
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

// POST route to handle project updates
router.post('/:id', ensureAuth, async (req, res) => {
  try {
    const { name, description, status, team, dueDate, progress, members } = req.body;

    // Process members (convert to array if single value)
    const memberIds = Array.isArray(members) ? members : members ? [members] : [];

    // Update project
    await Project.findByIdAndUpdate(req.params.id, {
      name,
      description,
      status,
      team,
      dueDate,
      progress: parseInt(progress) || 0,
      members: memberIds,
      updatedAt: Date.now()
    });

    res.redirect(`/projects/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

module.exports = router;
