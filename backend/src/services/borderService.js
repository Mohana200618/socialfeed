import { BORDER_POINTS, THRESHOLDS } from '../config/borderConfig.js';
import { haversineDistance, getBearing, compassDirection } from '../utils/distance.js';

/**
 * Calculates how far the given position is from the nearest
 * maritime border point and returns a status + message.
 */
export function checkBorderStatus(lat, lng) {
  const distances = BORDER_POINTS.map((point) => ({
    ...point,
    distance: haversineDistance(lat, lng, point.lat, point.lng),
  }));

  // Pick the closest border point
  const nearest = distances.reduce((prev, curr) =>
    curr.distance < prev.distance ? curr : prev
  );

  const minDistance = nearest.distance;

  let status;
  if (minDistance < THRESHOLDS.DANGER) {
    status = 'DANGER';
  } else if (minDistance < THRESHOLDS.WARNING) {
    status = 'WARNING';
  } else {
    status = 'SAFE';
  }

  // Calculate safe escape direction (opposite of direction toward border)
  const bearingToBorder = getBearing(lat, lng, nearest.lat, nearest.lng);
  const safeBearing = (bearingToBorder + 180) % 360;
  const safeDirection = compassDirection(safeBearing);

  return {
    lat,
    lng,
    nearestBorderPoint: nearest.name,
    distanceKm: parseFloat(minDistance.toFixed(2)),
    status,
    message: getStatusMessage(status, minDistance),
    safeDirection,
    escapeInstruction: getEscapeInstruction(status, safeDirection),
    thresholds: THRESHOLDS,
  };
}

function getStatusMessage(status, distance) {
  const km = distance.toFixed(1);
  switch (status) {
    case 'DANGER':
      return `DANGER: You are only ${km} km from the international border. Leave the area immediately!`;
    case 'WARNING':
      return `WARNING: You are ${km} km from the international border. Proceed with caution and turn back.`;
    default:
      return `SAFE: You are ${km} km from the border. You are in a safe fishing zone.`;
  }
}

function getEscapeInstruction(status, direction) {
  switch (status) {
    case 'DANGER':
      return `Steer your boat ${direction} immediately to move away from the border!`;
    case 'WARNING':
      return `Steer your boat ${direction} to return to safer waters.`;
    default:
      return `You are safe. Continue fishing.`;
  }
}
