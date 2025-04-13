# Planr - Project Management Web Application

Planr is a compact project management web application designed to help teams organize, track, and manage their projects efficiently.

## Features

- **Project Management**: Create, edit, and track projects with status, progress, and due dates
- **Task Management**: Organize tasks within projects, assign to team members, and track completion
- **Team Collaboration**: Manage team members and their assignments
- **Dashboard**: Get an overview of project progress, task distribution, and team workload
- **Milestone Tracking**: Set and monitor project milestones
- **Workload Management**: Balance team member workloads
- **Google Authentication**: Secure login with Google OAuth

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, CSS, JavaScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with Google OAuth
- **Session Management**: express-session with MongoDB store

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/encikiz/planr.git
   cd planr
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5050
   MONGODB_URI=your_mongodb_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CALLBACK_URL=http://localhost:5050/auth/google/callback
   ```

4. Start the application:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:5050`

## Scripts

- `npm start`: Start the application
- `npm run dev`: Start with nodemon for development
- `npm test`: Run tests (currently not implemented)

## License

ISC
