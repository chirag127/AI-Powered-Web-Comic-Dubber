# AI-Powered Web Comic Dubber - Backend

This is the backend component of the AI-Powered Web Comic Dubber project. It provides API endpoints for user authentication, voice settings storage, and other services.

## Features

- User authentication and registration
- Voice settings storage
- API endpoints for the browser extension

## Directory Structure

- `server.js` - Main server file
- `routes/` - API routes
  - `index.js` - Root routes
  - `auth.js` - Authentication routes
  - `settings.js` - Settings routes
- `controllers/` - Business logic
  - `settingsController.js` - Settings controller
  - `voiceController.js` - Voice controller
- `models/` - Database models
  - `User.js` - User model
  - `VoiceSettings.js` - Voice settings model
- `services/` - External service integrations
- `config/` - Configuration files
  - `db.js` - Database configuration
- `middleware/` - Custom middleware
  - `auth.js` - Authentication middleware
- `utils/` - Utility functions
  - `helpers.js` - Helper utilities

## Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on `.env.example` and add your configuration.

3. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/user` - Get authenticated user

### Settings

- `GET /api/settings/voices` - Get user's voice settings
- `POST /api/settings/voices` - Save user's voice settings
- `DELETE /api/settings/voices` - Reset user's voice settings

## Development

To run the server in development mode with auto-restart:

```
npm run dev
```

## Dependencies

- [Express](https://expressjs.com/) - Web framework
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- [JWT](https://jwt.io/) - Authentication
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) - Password hashing
