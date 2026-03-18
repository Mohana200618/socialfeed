import express from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('phoneNumber')
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Phone number must be 10 to 15 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .optional({ values: 'falsy' })
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Confirm password does not match password'),
  body('role').isIn(['fisherman', 'volunteer', 'admin']).withMessage('Invalid role')
], register);

// @route   POST /api/auth/login
router.post('/login', [
  body('identifier').trim().notEmpty().withMessage('Username or phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

// @route   GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;
