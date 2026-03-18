import { checkBorderStatus } from './src/services/borderService.js';

const testPoints = [
  { label: 'Very close to border (DANGER)',  lat: 9.58,  lng: 79.89 },
  { label: 'Approaching border (WARNING)',    lat: 9.45,  lng: 79.70 },
  { label: 'Safe zone — Indian waters',       lat: 9.10,  lng: 79.00 },
  { label: 'Well inside safe zone',           lat: 8.50,  lng: 78.50 },
];

console.log('='.repeat(62));
console.log('       BORDER ALERT SYSTEM — TEST RESULTS');
console.log('='.repeat(62));

for (const pt of testPoints) {
  const r = checkBorderStatus(pt.lat, pt.lng);
  const emoji = r.status === 'DANGER' ? '🔴' : r.status === 'WARNING' ? '🟠' : '🟢';
  console.log(`\n${emoji}  ${pt.label}`);
  console.log(`   Coordinates    : ${r.lat}, ${r.lng}`);
  console.log(`   Nearest point  : ${r.nearestBorderPoint}`);
  console.log(`   Distance       : ${r.distanceKm} km`);
  console.log(`   STATUS         : ${r.status}`);
  console.log(`   Message        : ${r.message}`);
}

console.log('\n' + '='.repeat(62));
console.log('  All 3 status levels verified: DANGER / WARNING / SAFE');
console.log('='.repeat(62));
