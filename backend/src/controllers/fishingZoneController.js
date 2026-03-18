import FishingZone from '../models/FishingZone.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllZones = asyncHandler(async (req, res) => {
  const zones = await FishingZone.findAll();
  res.json({ success: true, data: zones });
});

export const getZoneById = asyncHandler(async (req, res) => {
  const zone = await FishingZone.findById(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, error: 'Fishing zone not found' });
  }
  res.json({ success: true, data: zone });
});

export const createZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.create(req.body);
  res.status(201).json({ success: true, data: zone });
});

export const updateZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.update(req.params.id, req.body);
  if (!zone) {
    return res.status(404).json({ success: false, error: 'Fishing zone not found' });
  }
  res.json({ success: true, data: zone });
});

export const deleteZone = asyncHandler(async (req, res) => {
  const zone = await FishingZone.delete(req.params.id);
  if (!zone) {
    return res.status(404).json({ success: false, error: 'Fishing zone not found' });
  }
  res.json({ success: true, message: 'Fishing zone deleted successfully' });
});
