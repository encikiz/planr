const express = require('express');
const router = express.Router();
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// Mock data for dashboard
const dashboardData = {
  stats: {
    teamMembers: 12,
    activeProjects: 8,
    completedTasks: 376,
    pendingApprovals: 4
  },
  myTasks: [
    {
      id: 1,
      title: 'Design Homepage Mockup',
      project: 'Website Redesign',
      priority: 'High',
      status: 'In Progress',
      dueDate: '2023-12-10',
      progress: 60
    },
    {
      id: 2,
      title: 'Create User Flow Diagrams',
      project: 'Mobile App Development',
      priority: 'Medium',
      status: 'Not Started',
      dueDate: '2023-12-15',
      progress: 0
    },
    {
      id: 3,
      title: 'Review Content Strategy',
      project: 'Brand Guidelines',
      priority: 'Low',
      status: 'Completed',
      dueDate: '2023-12-05',
      progress: 100
    },
    {
      id: 4,
      title: 'Implement Authentication',
      project: 'Mobile App Development',
      priority: 'Urgent',
      status: 'In Progress',
      dueDate: '2023-12-08',
      progress: 35
    },
    {
      id: 5,
      title: 'Finalize Color Palette',
      project: 'Brand Guidelines',
      priority: 'Medium',
      status: 'On Hold',
      dueDate: '2023-12-20',
      progress: 50
    }
  ],
  statusCards: [
    {
      title: 'Total Active Projects',
      value: 8,
      icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z',
      color: 'blue',
      trend: {
        value: 12,
        isPositive: true
      }
    },
    {
      title: 'Projects Due This Week',
      value: 3,
      icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z',
      color: 'amber',
      trend: {
        value: 20,
        isPositive: false
      }
    },
    {
      title: 'Overdue Tasks',
      value: 5,
      icon: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
      color: 'red',
      trend: {
        value: 8,
        isPositive: false
      }
    },
    {
      title: 'Team Utilization',
      value: '78%',
      icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      color: 'green',
      trend: {
        value: 5,
        isPositive: true
      }
    }
  ],
  recentProjects: [
    {
      name: 'Website Redesign',
      description: 'Marketing',
      status: 'Active',
      team: 'Design Team',
      progress: 75,
      dueDate: '2023-12-15'
    },
    {
      name: 'Mobile App Development',
      description: 'Development',
      status: 'Active',
      team: 'Dev Team',
      progress: 45,
      dueDate: '2024-01-20'
    },
    {
      name: 'Brand Guidelines',
      description: 'Marketing',
      status: 'Pending',
      team: 'Design Team',
      progress: 30,
      dueDate: '2023-12-10'
    },
    {
      name: 'Q4 Marketing Campaign',
      description: 'Marketing',
      status: 'Completed',
      team: 'Marketing Team',
      progress: 100,
      dueDate: '2023-11-30'
    }
  ],
  projectProgress: [
    { name: 'Website Redesign', completed: 75, remaining: 25 },
    { name: 'Mobile App', completed: 45, remaining: 55 },
    { name: 'Brand Guidelines', completed: 30, remaining: 70 },
    { name: 'Marketing Campaign', completed: 100, remaining: 0 },
    { name: 'CRM Integration', completed: 60, remaining: 40 }
  ],
  taskDistribution: [
    { label: 'Completed', value: 45, color: '#10b981' },
    { label: 'In Progress', value: 30, color: '#3b82f6' },
    { label: 'Not Started', value: 15, color: '#f59e0b' },
    { label: 'Overdue', value: 10, color: '#ef4444' }
  ],
  recentActivity: [
    {
      id: 1,
      type: 'task_completed',
      user: {
        name: 'John Doe',
        avatar: '/images/avatars/avatar-1.jpg'
      },
      content: 'completed the task',
      target: 'Review Content Strategy',
      project: 'Brand Guidelines',
      timestamp: '2023-12-05T14:30:00Z'
    },
    {
      id: 2,
      type: 'comment_added',
      user: {
        name: 'Sarah Johnson',
        avatar: '/images/avatars/avatar-2.jpg'
      },
      content: 'commented on',
      target: 'Design Homepage Mockup',
      comment: 'I think we should use a lighter color palette for the hero section.',
      timestamp: '2023-12-05T13:15:00Z'
    },
    {
      id: 3,
      type: 'project_created',
      user: {
        name: 'Michael Chen',
        avatar: '/images/avatars/avatar-3.jpg'
      },
      content: 'created a new project',
      target: 'Customer Portal Redesign',
      timestamp: '2023-12-05T11:45:00Z'
    },
    {
      id: 4,
      type: 'task_assigned',
      user: {
        name: 'Emily Wilson',
        avatar: '/images/avatars/avatar-4.jpg'
      },
      content: 'assigned',
      target: 'Implement Authentication',
      assignee: 'Alex Rodriguez',
      project: 'Mobile App Development',
      timestamp: '2023-12-05T10:20:00Z'
    },
    {
      id: 5,
      type: 'milestone_reached',
      user: {
        name: 'Team',
        avatar: '/images/avatars/team.jpg'
      },
      content: 'reached a milestone',
      target: 'Alpha Release',
      project: 'Mobile App Development',
      timestamp: '2023-12-04T16:30:00Z'
    },
    {
      id: 6,
      type: 'file_uploaded',
      user: {
        name: 'David Kim',
        avatar: '/images/avatars/avatar-5.jpg'
      },
      content: 'uploaded',
      target: 'final-mockups.zip',
      project: 'Website Redesign',
      timestamp: '2023-12-04T14:45:00Z'
    },
    {
      id: 7,
      type: 'task_updated',
      user: {
        name: 'Lisa Wang',
        avatar: '/images/avatars/avatar-6.jpg'
      },
      content: 'updated the due date for',
      target: 'Create User Flow Diagrams',
      change: 'Dec 10 → Dec 15',
      project: 'Mobile App Development',
      timestamp: '2023-12-04T11:20:00Z'
    }
  ]
};

// Helper function to sort projects
const sortProjects = (projects, sortBy) => {
  const projectsCopy = [...projects];

  switch (sortBy) {
    case 'name':
      return projectsCopy.sort((a, b) => a.name.localeCompare(b.name));
    case 'progress':
      return projectsCopy.sort((a, b) => b.progress - a.progress);
    case 'dueDate':
      return projectsCopy.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    default:
      return projectsCopy; // Default: no sorting
  }
};

// Helper function to filter projects
const filterProjects = (projects, filters) => {
  return projects.filter(project => {
    // Filter by status
    if (filters.status && filters.status !== 'all' && project.status.toLowerCase() !== filters.status) {
      return false;
    }

    // Filter by team
    if (filters.team && filters.team !== 'all' && project.team !== filters.team) {
      return false;
    }

    return true;
  });
};

// Login route
router.get('/login', ensureGuest, (req, res) => {
  res.render('login', {
    title: 'Login',
    layout: false
  });
});

// Dashboard route
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get query parameters for sorting and filtering
    const sortBy = req.query.sort || 'default';
    const statusFilter = req.query.status || 'all';
    const teamFilter = req.query.team || 'all';

    // Create a copy of the dashboard data
    const dashboardDataCopy = JSON.parse(JSON.stringify(dashboardData));

    // Apply filters
    dashboardDataCopy.recentProjects = filterProjects(dashboardDataCopy.recentProjects, {
      status: statusFilter,
      team: teamFilter
    });

    // Apply sorting
    dashboardDataCopy.recentProjects = sortProjects(dashboardDataCopy.recentProjects, sortBy);

    // Get unique teams for the filter dropdown
    const teams = [...new Set(dashboardData.recentProjects.map(project => project.team))];

    // Get real tasks for the current user
    const myTasks = await Task.find({ assignedTo: req.user._id })
      .populate('project', 'name')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    // Format tasks for the dashboard
    const formattedTasks = myTasks.map(task => ({
      id: task._id,
      title: task.title,
      project: task.project ? task.project.name : 'Unknown Project',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
      progress: task.status === 'Completed' ? 100 :
                task.status === 'In Progress' ? 50 :
                task.status === 'On Hold' ? 25 : 0
    }));

    // Update the dashboard data with real tasks
    dashboardDataCopy.myTasks = formattedTasks.length > 0 ? formattedTasks : dashboardDataCopy.myTasks;

    // Get stats
    const completedTasksCount = await Task.countDocuments({
      assignedTo: req.user._id,
      status: 'Completed'
    });

    const activeProjectsCount = await Project.countDocuments({
      status: 'Active',
      members: req.user._id
    });

    // Update stats with real data if available
    if (completedTasksCount > 0) {
      dashboardDataCopy.stats.completedTasks = completedTasksCount;
    }

    if (activeProjectsCount > 0) {
      dashboardDataCopy.stats.activeProjects = activeProjectsCount;
    }

    res.render('dashboard', {
      title: 'Dashboard',
      dashboardData: dashboardDataCopy,
      filters: {
        sort: sortBy,
        status: statusFilter,
        team: teamFilter
      },
      teams: teams
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
