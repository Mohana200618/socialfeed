import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';
import { validateUser } from '../validators/userValidator.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/', validateUser, createUser);

// Protected routes (require authentication)
router.get('/', authenticate, getAllUsers);
router.get('/:id', authenticate, getUserById);
router.put('/:id', authenticate, validateUser, updateUser);
router.delete('/:id', authenticate, deleteUser);

export default router;
