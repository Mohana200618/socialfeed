import express from 'express';
import { 
  getAllZones, 
  getZoneById, 
  createZone, 
  updateZone, 
  deleteZone 
} from '../controllers/fishingZoneController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllZones);
router.get('/:id', authenticate, getZoneById);
router.post('/', authenticate, createZone);
router.put('/:id', authenticate, updateZone);
router.delete('/:id', authenticate, deleteZone);

export default router;
