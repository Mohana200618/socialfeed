import { body } from 'express-validator';

export const validateUser = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
];
