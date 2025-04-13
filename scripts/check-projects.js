const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Count projects
      const projectCount = await Project.countDocuments();
      console.log(`There are ${projectCount} projects in the database.`);
      
      // Get all projects
      if (projectCount > 0) {
        const projects = await Project.find().lean();
        console.log('Projects:');
        projects.forEach(project => {
          console.log(`- ${project.name} (ID: ${project._id}, Status: ${project.status})`);
        });
      }
    } catch (error) {
      console.error('Error checking projects:', error);
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
