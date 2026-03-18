import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN 
    : '*', // Allow all origins in development
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static files for uploaded media evidence
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
