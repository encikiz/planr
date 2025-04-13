const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const methodOverride = require('method-override');

// Load config
dotenv.config();

// Passport config
require('./config/passport')(passport);

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050;

// Set up middleware
app.use(morgan('dev')); // Logging
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Method override middleware
app.use(methodOverride('_method'));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Set global variable for templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const teamRoutes = require('./routes/teams');
const milestoneRoutes = require('./routes/milestones');
const workloadRoutes = require('./routes/workload');
const taskRoutes = require('./routes/tasks');
const availabilityRoutes = require('./routes/availability');


// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/teams', teamRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/workload', workloadRoutes);
app.use('/tasks', taskRoutes);
app.use('/availability', availabilityRoutes);


// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    layout: 'layouts/main'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    error: err,
    layout: 'layouts/main'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
