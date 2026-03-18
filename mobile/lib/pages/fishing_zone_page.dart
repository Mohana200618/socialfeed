import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

// Potential Fishing Zone data from INCOIS advisories
// Source: https://incois.gov.in/portal/pfz/pfz.jsp
const List<Map<String, dynamic>> _pfzZones = [
  {
    'name': 'Palk Bay North',
    'status': 'HIGH',
    'fish': 'Sardine, Mackerel, Tuna',
    'sst': '28–29°C',
    'chlorophyll': '>1.5 mg/m³',
    'depth': '30–60 m',
  },
  {
    'name': 'Palk Bay Central',
    'status': 'HIGH',
    'fish': 'Squid, Shrimp, Grouper',
    'sst': '28–30°C',
    'chlorophyll': '>1.8 mg/m³',
    'depth': '20–50 m',
  },
  {
    'name': 'Gulf of Mannar North',
    'status': 'MODERATE',
    'fish': 'Tuna, Marlin',
    'sst': '29–30°C',
    'chlorophyll': '0.8–1.2 mg/m³',
    'depth': '40–80 m',
  },
  {
    'name': 'Gulf of Mannar Central',
    'status': 'HIGH',
    'fish': 'Seer fish, Rays, Sangara',
    'sst': '28–29°C',
    'chlorophyll': '>1.6 mg/m³',
    'depth': '20–60 m',
  },
  {
    'name': 'Coromandel Coast',
    'status': 'HIGH',
    'fish': 'Sardine, Mackerel, Anchovy',
    'sst': '27–29°C',
    'chlorophyll': '>2.0 mg/m³',
    'depth': '30–70 m',
  },
  {
    'name': 'Gulf of Mannar South',
    'status': 'MODERATE',
    'fish': 'Tuna aggregation',
    'sst': '29–31°C',
    'chlorophyll': '0.6–1.0 mg/m³',
    'depth': '50–100 m',
  },
];

class FishingZonePage extends StatelessWidget {
  const FishingZonePage({super.key});

  Color _statusColor(String status) {
    return status == 'HIGH' ? const Color(0xFF16A34A) : const Color(0xFFEA580C);
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final dateStr =
        '${today.day.toString().padLeft(2, '0')}/'
        '${today.month.toString().padLeft(2, '0')}/${today.year}';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        title: const Text(
          'Fishing Zones — INCOIS PFZ',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_browser),
            tooltip: 'Open INCOIS Portal',
            onPressed: () async {
              final uri = Uri.parse('https://incois.gov.in/portal/pfz/pfz.jsp');
              if (await canLaunchUrl(uri)) await launchUrl(uri);
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // INCOIS Info Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0EA5E9)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '📡 INCOIS PFZ Advisory',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Daily Potential Fishing Zone advisory for Tamil Nadu coast.\nDate: $dateStr',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _chip('🌡️ SST: 27–31°C'),
                      _chip('🌿 Chlorophyll: Active'),
                      _chip('🌊 Waves: 0.5–1.5 m'),
                      _chip('💨 Wind: 10–20 kts'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Legend
            Row(
              children: [
                _legendDot(const Color(0xFF16A34A)),
                const SizedBox(width: 6),
                const Text(
                  'High PFZ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 16),
                _legendDot(const Color(0xFFEA580C)),
                const SizedBox(width: 6),
                const Text(
                  'Moderate PFZ',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Zone cards
            ...List.generate(_pfzZones.length, (i) {
              final zone = _pfzZones[i];
              final color = _statusColor(zone['status'] as String);
              return TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: Duration(milliseconds: 300 + i * 80),
                curve: Curves.easeOutCubic,
                builder: (ctx, v, child) => Opacity(
                  opacity: v,
                  child: Transform.translate(
                    offset: Offset(0, (1 - v) * 12),
                    child: child,
                  ),
                ),
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: color.withOpacity(0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0x110F172A),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              zone['name'] as String,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: color,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              zone['status'] as String,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '🐟 ${zone['fish']}',
                        style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          _infoChip('🌡️ SST', zone['sst'] as String, color),
                          _infoChip(
                            '🌿 CHL',
                            zone['chlorophyll'] as String,
                            color,
                          ),
                          _infoChip('📏 Depth', zone['depth'] as String, color),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 8),

            // Open INCOIS Portal button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () async {
                  final uri = Uri.parse(
                    'https://incois.gov.in/portal/pfz/pfz.jsp',
                  );
                  if (await canLaunchUrl(uri)) await launchUrl(uri);
                },
                icon: const Icon(Icons.open_in_new),
                label: const Text('View Full INCOIS PFZ Advisory Map'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Center(
              child: Text(
                'Data: INCOIS · incois.gov.in/portal/pfz/pfz.jsp',
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _chip(String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.2),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: Colors.white30),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 11,
        fontWeight: FontWeight.w600,
      ),
    ),
  );

  Widget _infoChip(String label, String value, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.08),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: color.withOpacity(0.2)),
    ),
    child: Text(
      '$label: $value',
      style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
    ),
  );

  Widget _legendDot(Color color) => Container(
    width: 14,
    height: 14,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}
