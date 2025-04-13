const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');
const Task = require('../models/Task');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Delete all tasks associated with projects
      const tasksDeleted = await Task.deleteMany({});
      console.log(`Deleted ${tasksDeleted.deletedCount} tasks`);
      
      // Delete all projects
      const projectsDeleted = await Project.deleteMany({});
      console.log(`Deleted ${projectsDeleted.deletedCount} projects`);
      
      console.log('All projects and associated tasks have been removed from the database.');
    } catch (error) {
      console.error('Error clearing projects:', error);
    } finally {
      // Close the connection
      mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });
