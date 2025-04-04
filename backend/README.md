# AI-Powered Web Comic Dubber - Backend

This is the backend server for the AI-Powered Web Comic Dubber browser extension. It provides API endpoints for user authentication, voice settings storage, OCR enhancement, and TTS processing.

## Features

- User authentication and profile management
- Voice settings storage
- OCR enhancement (optional)
- TTS processing (optional)

## Installation

1. Install dependencies:

```
npm install
```

2. Create a `.env` file based on `.env.example` and add your configuration:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/comic-dubber
# For MongoDB Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/comic-dubber

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

3. Start the server:

```
npm start
```

For development with auto-restart:

```
npm run dev
```

## API Endpoints

### User Routes

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Settings Routes

- `GET /api/settings` - Get user settings (protected)
- `PUT /api/settings` - Update user settings (protected)
- `GET /api/settings/characters` - Get character voice settings (protected)
- `PUT /api/settings/characters` - Update character voice settings (protected)

### OCR Routes

- `POST /api/ocr/process` - Process image for OCR (protected)
- `POST /api/ocr/enhance` - Enhance OCR results (protected)

### TTS Routes

- `POST /api/tts/generate` - Generate speech from text (protected)
- `GET /api/tts/voices` - Get available voices

## Structure

- `server.js` - Main server file
- `routes/` - API routes
- `controllers/` - Business logic
- `models/` - Database models
- `services/` - External service integrations (OCR, TTS)
- `config/` - Configuration files
- `utils/` - Utility functions

## Development

To modify or enhance the backend:

1. Edit the relevant files in the appropriate directories
2. Restart the server or use `npm run dev` for auto-restart
3. Test your changes using a tool like Postman or by connecting the browser extension

## License

MIT
