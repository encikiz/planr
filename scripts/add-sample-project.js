const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('../models/Project');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Find a user to set as the creator
      const user = await User.findOne();
      
      if (!user) {
        console.log('No users found in the database. Please create a user first.');
        mongoose.connection.close();
        return;
      }
      
      // Create a sample project
      const sampleProject = {
        name: 'Sample Project',
        description: 'This is a sample project to test the projects page',
        status: 'Active',
        team: 'Test Team',
        progress: 50,
        dueDate: new Date('2024-12-31'),
        createdBy: user._id,
        members: [user._id]
      };
      
      // Add the project to the database
      const newProject = await Project.create(sampleProject);
      console.log('Sample project added:', newProject);
      
    } catch (error) {
      console.error('Error adding sample project:', error);
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
