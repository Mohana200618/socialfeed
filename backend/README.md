# Backend API

Node.js/Express REST API server.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)

### Installation

```bash
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the environment variables in `.env` with your configuration.

### Running the Server

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Running Tests

```bash
npm test
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── middleware/       # Custom middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── validators/       # Input validation schemas
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── tests/                # Test files
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore rules
└── package.json         # Dependencies and scripts
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Example Endpoints
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Environment Variables

See `.env.example` for all available configuration options.
