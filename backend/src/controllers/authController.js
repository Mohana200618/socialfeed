import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/jwt.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, password, role } = req.body;
  const normalizedPhone = String(req.body.phoneNumber).replace(/[^0-9+]/g, '');
  const normalizedUsername = username.trim();

  // Check if user already exists
  const existingUser = await User.findByUsername(normalizedUsername);
  if (existingUser) {
    return res.status(400).json({ success: false, error: 'Username already exists' });
  }

  const existingPhone = await User.findByPhone(normalizedPhone);
  if (existingPhone) {
    return res.status(400).json({ success: false, error: 'Phone number already registered' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    username: normalizedUsername,
    phoneNumber: normalizedPhone,
    password: hashedPassword,
    role
  });

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        phoneNumber: user.phone_number,
        role: user.role
      },
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { password } = req.body;
  const rawIdentifier = String(req.body.identifier || '').trim();
  const identifier = /^\+?[0-9\s-]+$/.test(rawIdentifier)
    ? rawIdentifier.replace(/[^0-9+]/g, '')
    : rawIdentifier;

  // Find user by username or phone
  const user = await User.findByUsernameOrPhone(identifier);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // Check if user is active
  if (!user.is_active) {
    return res.status(401).json({ success: false, error: 'Account is deactivated' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        phoneNumber: user.phone_number,
        role: user.role
      },
      token
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  res.json({
    success: true,
    data: user
  });
});
