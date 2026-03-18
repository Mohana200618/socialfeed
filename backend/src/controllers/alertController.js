import Alert from '../models/Alert.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAllAlerts = asyncHandler(async (req, res) => {
  const { severity, alertType, limit } = req.query;
  const alerts = await Alert.findAll({ severity, alertType, limit });
  res.json({ success: true, data: alerts });
});

export const getTopAlerts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 3;
  const alerts = await Alert.getTopAlertsBySeverity(limit);
  res.json({ success: true, data: alerts });
});

export const getAlertById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }
  res.json({ success: true, data: alert });
});

export const createAlert = asyncHandler(async (req, res) => {
  const alertData = { ...req.body, createdBy: req.user.id };
  const alert = await Alert.create(alertData);
  res.status(201).json({ success: true, data: alert });
});

export const updateAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.update(req.params.id, req.body);
  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }
  res.json({ success: true, data: alert });
});

export const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.delete(req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }
  res.json({ success: true, message: 'Alert deleted successfully' });
});
