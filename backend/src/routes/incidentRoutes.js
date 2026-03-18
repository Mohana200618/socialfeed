import express from 'express';
import { 
  getAllIncidents, 
  getIncidentById, 
  createIncident, 
  updateIncident, 
  deleteIncident,
  uploadIncidentMedia,
} from '../controllers/incidentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadIncidentMedia as uploadIncidentMediaMiddleware } from '../middleware/upload.js';

const router = express.Router();

router.get('/', authenticate, getAllIncidents);
router.get('/:id', authenticate, getIncidentById);
router.post('/', authenticate, createIncident);
router.post(
  '/:id/media',
  authenticate,
  uploadIncidentMediaMiddleware.array('files', 10),
  uploadIncidentMedia
);
router.put('/:id', authenticate, updateIncident);
router.delete('/:id', authenticate, deleteIncident);

export default router;
