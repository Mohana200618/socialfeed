import { validationResult } from 'express-validator';
import UserService from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all users
// @route   GET /api/users
// @access  Private
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await UserService.findAll();
  res.json({ success: true, data: users });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
export const getUserById = asyncHandler(async (req, res) => {
  const user = await UserService.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  res.json({ success: true, data: user });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Public
export const createUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const user = await UserService.create(req.body);
  res.status(201).json({ success: true, data: user });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const user = await UserService.update(req.params.id, req.body);
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  res.json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await UserService.delete(req.params.id);
  
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  
  res.json({ success: true, message: 'User deleted successfully' });
});
