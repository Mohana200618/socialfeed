import express from 'express';
import { 
  getAllAlerts, 
  getTopAlerts,
  getAlertById, 
  createAlert, 
  updateAlert, 
  deleteAlert 
} from '../controllers/alertController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllAlerts);
router.get('/top', authenticate, getTopAlerts);
router.get('/:id', authenticate, getAlertById);
router.post('/', authenticate, createAlert);
router.put('/:id', authenticate, updateAlert);
router.delete('/:id', authenticate, deleteAlert);

export default router;
