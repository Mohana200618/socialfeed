import UserSettings from '../models/UserSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUserSettings = asyncHandler(async (req, res) => {
  const settings = await UserSettings.getOrCreate(req.user.id);
  res.json({ success: true, data: settings });
});

export const updateUserSettings = asyncHandler(async (req, res) => {
  const settings = await UserSettings.update(req.user.id, req.body);
  if (!settings) {
    // If settings don't exist, create them
    const newSettings = await UserSettings.create(req.user.id, req.body);
    return res.json({ success: true, data: newSettings });
  }
  res.json({ success: true, data: settings });
});
