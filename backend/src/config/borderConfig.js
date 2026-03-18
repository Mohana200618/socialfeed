// Approximate India–Sri Lanka International Maritime Boundary Line (IMBL)
// coordinates in the Palk Strait and Gulf of Mannar.
// Source: well-known public maritime boundary reference points.
export const BORDER_POINTS = [
  { lat: 9.8500, lng: 80.1000, name: 'Palk Strait North' },
  { lat: 9.7500, lng: 80.0167, name: 'Palk Strait Mid-North' },
  { lat: 9.5833, lng: 79.8833, name: 'Palk Strait Centre' },
  { lat: 9.3167, lng: 79.6833, name: 'Palk Bay South' },
  { lat: 9.2500, lng: 79.5500, name: 'Near Neduntheevu' },
  { lat: 9.1667, lng: 79.4167, name: 'Palk Bay SW' },
  { lat: 8.9167, lng: 79.9167, name: 'Gulf of Mannar North' },
  { lat: 8.7500, lng: 79.7500, name: 'Gulf of Mannar Centre' },
  { lat: 8.5833, lng: 79.5500, name: 'Gulf of Mannar South' },
  { lat: 8.3500, lng: 79.3500, name: 'Gulf of Mannar SW' },
];

// Distance thresholds in kilometres
export const THRESHOLDS = {
  DANGER: 5,   // < 5 km  → RED   — immediate danger
  WARNING: 15, // < 15 km → ORANGE — caution zone
};
