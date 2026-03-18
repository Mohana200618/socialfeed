import Incident from '../models/Incident.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const normalizeIncidentStatus = (value) => {
  const normalized = String(value ?? '').toLowerCase().trim();
  if (!normalized) return normalized;
  if (normalized === 'in progress' || normalized === 'in_progress' || normalized === 'in-progress') {
    return 'investigating';
  }
  if (normalized === 'closed') {
    return 'resolved';
  }
  return normalized;
};

const presentIncidentStatus = (value) => {
  const normalized = normalizeIncidentStatus(value);
  if (normalized === 'investigating') {
    return 'in progress';
  }
  return normalized || 'pending';
};

const buildPublicUrl = (req, relativePath) => {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const host = `${req.protocol}://${req.get('host')}`;
  return `${host}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
};

const mapMediaType = (value = '') => {
  const normalized = String(value).toLowerCase().trim();
  if (normalized.startsWith('image')) return 'image';
  if (normalized.startsWith('video')) return 'video';
  if (normalized.startsWith('audio')) return 'audio';
  return 'file';
};

const normalizeIncidentMedia = (req, incident) => {
  if (!incident) return incident;

  const attachments = Array.isArray(incident.media_attachments)
    ? incident.media_attachments
    : [];

  return {
    ...incident,
    status: presentIncidentStatus(incident.status),
    media_attachments: attachments.map((item, index) => ({
      id: item.id ?? `${incident.id}-${index}`,
      type: mapMediaType(item.type ?? item.mimeType),
      fileName: item.fileName ?? item.filename ?? `attachment-${index + 1}`,
      mimeType: item.mimeType ?? null,
      size: item.size ?? null,
      capturedAt: item.capturedAt ?? null,
      uploadedAt: item.uploadedAt ?? item.createdAt ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      locationName: item.locationName ?? null,
      url: buildPublicUrl(req, item.url),
    })),
  };
};

export const getAllIncidents = asyncHandler(async (req, res) => {
  const { status, reportedBy } = req.query;
  const incidents = await Incident.findAll({
    status: normalizeIncidentStatus(status),
    reportedBy,
  });
  res.json({
    success: true,
    data: incidents.map((incident) => normalizeIncidentMedia(req, incident)),
  });
});

export const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, data: normalizeIncidentMedia(req, incident) });
});

export const createIncident = asyncHandler(async (req, res) => {
  const incidentData = {
    ...req.body,
    status: normalizeIncidentStatus(req.body.status),
    reportedBy: req.user.id,
  };
  const incident = await Incident.create(incidentData);
  res.status(201).json({ success: true, data: normalizeIncidentMedia(req, incident) });
});

export const updateIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.update(req.params.id, {
    ...req.body,
    status: normalizeIncidentStatus(req.body.status),
  });
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, data: normalizeIncidentMedia(req, incident) });
});

export const uploadIncidentMedia = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }

  const files = req.files ?? [];
  if (!files.length) {
    return res.status(400).json({ success: false, error: 'No files uploaded' });
  }

  let mediaTypes = [];
  if (req.body.mediaTypes) {
    try {
      mediaTypes = JSON.parse(req.body.mediaTypes);
    } catch {
      mediaTypes = [];
    }
  }

  let geoTags = [];
  if (req.body.geoTags) {
    try {
      geoTags = JSON.parse(req.body.geoTags);
    } catch {
      geoTags = [];
    }
  }

  const mediaAttachments = files.map((file, index) => {
    const requestedType = Array.isArray(mediaTypes) ? mediaTypes[index] : null;
    const inferredType = mapMediaType(requestedType || file.mimetype);
    const geoTag = Array.isArray(geoTags) ? geoTags[index] : null;

    return {
      id: `${Date.now()}-${index}`,
      type: inferredType,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/incidents/${file.filename}`,
      capturedAt: geoTag?.capturedAt ?? null,
      uploadedAt: new Date().toISOString(),
      latitude: geoTag?.latitude ?? null,
      longitude: geoTag?.longitude ?? null,
      locationName: geoTag?.locationName ?? null,
    };
  });

  const updatedIncident = await Incident.addMediaAttachments(
    req.params.id,
    mediaAttachments
  );

  res.status(201).json({
    success: true,
    message: 'Incident media uploaded successfully',
    data: normalizeIncidentMedia(req, updatedIncident),
  });
});

export const deleteIncident = asyncHandler(async (req, res) => {
  const incident = await Incident.delete(req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, message: 'Incident deleted successfully' });
});
