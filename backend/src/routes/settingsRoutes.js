import express from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getUserSettings);
router.put('/', authenticate, updateUserSettings);

export default router;
