const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Team = require('../models/Team');
const Project = require('../models/Project');
const User = require('../models/User');

// Helper function to determine performance class based on score
const getPerformanceClass = (performance) => {
  if (performance >= 80) return 'excellent';
  if (performance >= 60) return 'good';
  if (performance >= 40) return 'average';
  return 'poor';
};

// Helper function to calculate team performance
const calculateTeamPerformance = async (teamName) => {
  try {
    // Get all projects for this team
    const projects = await Project.find({ team: teamName }).lean();

    if (projects.length === 0) {
      return {
        name: teamName,
        totalProjects: 0,
        completedProjects: 0,
        onTimeDelivery: 0,
        performance: 0
      };
    }

    // Calculate metrics
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;

    // Calculate on-time delivery (simplified for now)
    let onTimeCount = 0;
    const completedProjectsList = projects.filter(p => p.status === 'Completed');

    completedProjectsList.forEach(project => {
      if (project.dueDate && new Date(project.dueDate) >= new Date(project.updatedAt)) {
        onTimeCount++;
      }
    });

    const onTimeDelivery = completedProjects > 0
      ? Math.round((onTimeCount / completedProjects) * 100)
      : 0;

    // Calculate overall performance (simplified formula)
    const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
    const performance = Math.round((completionRate * 0.6) + (onTimeDelivery * 0.4));

    return {
      name: teamName,
      totalProjects,
      completedProjects,
      onTimeDelivery,
      performance
    };
  } catch (error) {
    console.error('Error calculating team performance:', error);
    return null;
  }
};

// Mock data for teams - will be removed once database is fully implemented
/*const teams = [
  {
    id: 1,
    name: 'Design Team',
    description: 'Responsible for UI/UX design and brand identity.',
    activeProjects: 3,
    createdDate: '2023-01-15',
    members: [
      { name: 'Jane Smith', role: 'Lead Designer', avatar: '/images/avatars/avatar-2.jpg' },
      { name: 'Olivia Martinez', role: 'UI Designer', avatar: '/images/avatars/avatar-8.jpg' },
      { name: 'James Taylor', role: 'UX Designer', avatar: '/images/avatars/avatar-9.jpg' },
      { name: 'Emma White', role: 'Graphic Designer', avatar: '/images/avatars/avatar-12.jpg' }
    ]
  },
  {
    id: 2,
    name: 'Development Team',
    description: 'Responsible for software development and implementation.',
    activeProjects: 4,
    createdDate: '2023-01-10',
    members: [
      { name: 'John Doe', role: 'Lead Developer', avatar: '/images/avatars/avatar-1.jpg' },
      { name: 'Mike Johnson', role: 'Backend Developer', avatar: '/images/avatars/avatar-3.jpg' },
      { name: 'Alex Turner', role: 'Frontend Developer', avatar: '/images/avatars/avatar-5.jpg' },
      { name: 'Emily Clark', role: 'Mobile Developer', avatar: '/images/avatars/avatar-6.jpg' },
      { name: 'David Wilson', role: 'DevOps Engineer', avatar: '/images/avatars/avatar-7.jpg' },
      { name: 'William Miller', role: 'QA Engineer', avatar: '/images/avatars/avatar-15.jpg' }
    ]
  },
  {
    id: 3,
    name: 'Marketing Team',
    description: 'Responsible for marketing campaigns and brand promotion.',
    activeProjects: 2,
    createdDate: '2023-02-05',
    members: [
      { name: 'Sarah Williams', role: 'Marketing Manager', avatar: '/images/avatars/avatar-4.jpg' },
      { name: 'Sophia Anderson', role: 'Content Strategist', avatar: '/images/avatars/avatar-10.jpg' },
      { name: 'Daniel Thomas', role: 'SEO Specialist', avatar: '/images/avatars/avatar-11.jpg' },
      { name: 'Isabella Garcia', role: 'Social Media Manager', avatar: '/images/avatars/avatar-14.jpg' }
    ]
  },
  {
    id: 4,
    name: 'Product Team',
    description: 'Responsible for product strategy and roadmap.',
    activeProjects: 1,
    createdDate: '2023-03-20',
    members: [
      { name: 'Michael Brown', role: 'Product Manager', avatar: '/images/avatars/avatar-13.jpg' },
      { name: 'Ava Davis', role: 'Product Owner', avatar: '/images/avatars/avatar-16.jpg' },
      { name: 'Noah Smith', role: 'Business Analyst', avatar: '/images/avatars/avatar-19.jpg' }
    ]
  },
  {
    id: 5,
    name: 'Customer Support',
    description: 'Responsible for customer service and support.',
    activeProjects: 0,
    createdDate: '2023-04-10',
    members: [
      { name: 'Charlotte Brown', role: 'Support Manager', avatar: '/images/avatars/avatar-20.jpg' },
      { name: 'Ethan Wilson', role: 'Support Specialist', avatar: '/images/avatars/avatar-17.jpg' },
      { name: 'Mia Johnson', role: 'Support Specialist', avatar: '/images/avatars/avatar-18.jpg' }
    ]
  }
];*/

// Teams routes
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get all teams
    const teams = await Team.find({})
      .populate('members.user', 'displayName firstName lastName image')
      .populate('createdBy', 'displayName')
      .lean();

    // Get active projects count for each team
    for (let team of teams) {
      const activeProjects = await Project.countDocuments({
        team: team.name,
        status: { $ne: 'Completed' }
      });
      team.activeProjects = activeProjects;
    }

    // Calculate performance for each team
    const teamPerformance = [];
    for (let team of teams) {
      const performance = await calculateTeamPerformance(team.name);
      if (performance) {
        teamPerformance.push(performance);
      }
    }

    res.render('teams/index', {
      title: 'Teams',
      teams,
      teamPerformance,
      getPerformanceClass,
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

router.get('/:id', ensureAuth, async (req, res) => {
  try {
    // Get team by ID
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'displayName firstName lastName image')
      .populate('createdBy', 'displayName')
      .lean();

    if (!team) {
      return res.status(404).render('404', {
        title: 'Team Not Found',
        layout: 'layouts/main'
      });
    }

    // Get active projects for this team
    const activeProjects = await Project.countDocuments({
      team: team.name,
      status: { $ne: 'Completed' }
    });
    team.activeProjects = activeProjects;

    // Calculate team performance
    const performance = await calculateTeamPerformance(team.name);

    // Get all users for adding members
    const users = await User.find({ isGuest: false }).lean();

    res.render('teams/detail', {
      title: team.name,
      team,
      performance,
      users,
      getPerformanceClass,
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

// @desc    Show new team form
// @route   GET /teams/new
router.get('/new/form', ensureAuth, async (req, res) => {
  try {
    res.render('teams/new', {
      title: 'Create New Team',
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

// @desc    Create new team
// @route   POST /teams
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Create new team
    await Team.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Team Lead' }]
    });

    res.redirect('/teams');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Add member to team
// @route   POST /teams/:id/members
router.post('/:id/members', ensureAuth, async (req, res) => {
  try {
    const { userId, role } = req.body;

    // Find team
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).render('404', {
        title: 'Team Not Found',
        layout: 'layouts/main'
      });
    }

    // Check if user is already a member
    const existingMember = team.members.find(m => m.user.toString() === userId);

    if (existingMember) {
      // Update role if user is already a member
      existingMember.role = role;
    } else {
      // Add new member
      team.members.push({
        user: userId,
        role
      });
    }

    await team.save();

    res.redirect(`/teams/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Remove member from team
// @route   DELETE /teams/:id/members/:userId
router.post('/:id/members/:userId/remove', ensureAuth, async (req, res) => {
  try {
    // Find team
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).render('404', {
        title: 'Team Not Found',
        layout: 'layouts/main'
      });
    }

    // Remove member
    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);

    await team.save();

    res.redirect(`/teams/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Edit team
// @route   POST /teams/:id
router.post('/:id', ensureAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Update team
    await Team.findByIdAndUpdate(req.params.id, {
      name,
      description,
      updatedAt: Date.now()
    });

    res.redirect(`/teams/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

// @desc    Delete team
// @route   DELETE /teams/:id
router.post('/:id/delete', ensureAuth, async (req, res) => {
  try {
    // Delete team
    await Team.findByIdAndDelete(req.params.id);

    res.redirect('/teams');
  } catch (err) {
    console.error(err);
    res.render('error', {
      title: 'Error',
      error: err
    });
  }
});

module.exports = router;
