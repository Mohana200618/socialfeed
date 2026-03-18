import express from 'express';
import { getAdvisory, getWMSInfo } from '../controllers/pfzController.js';

const router = express.Router();

// GET /api/pfz/advisory  — real-time INCOIS PFZ advisory data
router.get('/advisory', getAdvisory);

// GET /api/pfz/wms-info  — WMS endpoint config for the frontend map
router.get('/wms-info', getWMSInfo);

export default router;
