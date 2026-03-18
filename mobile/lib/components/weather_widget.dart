import 'package:flutter/material.dart';

class WeatherWidget extends StatelessWidget {
  const WeatherWidget({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock weather data - in real app, fetch from API
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.9),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.cloud, color: Color(0xFF0097A7)),
                  const SizedBox(width: 8),
                  const Text(
                    'Weather',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Color(0xFF0097A7),
                    ),
                  ),
                  const Spacer(),
                  Flexible(
                    child: Text(
                      'Nandambakkam',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.refresh, size: 16, color: Color(0xFF0097A7)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '25°C',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0097A7),
                          ),
                        ),
                        Text(
                          'CLEAR SKY',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.wb_sunny, color: Colors.orange, size: 44),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                children: [
                  _buildWeatherDetail(Icons.air, '1.4 m/s', constraints.maxWidth),
                  _buildWeatherDetail(Icons.water_drop, '69.0%', constraints.maxWidth),
                  _buildWeatherDetail(Icons.thermostat, 'Feels 26°C', constraints.maxWidth),
                  _buildWeatherDetail(Icons.speed, '1015.0 hPa', constraints.maxWidth),
                  _buildWeatherDetail(Icons.cloud_queue, '3.0% clouds', constraints.maxWidth),
                  _buildWeatherDetail(Icons.wb_twilight, '06:20 - 18:20', constraints.maxWidth),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildWeatherDetail(IconData icon, String text, double maxWidth) {
    final detailWidth = (maxWidth - 12) / 2;

    return SizedBox(
      width: detailWidth.clamp(120, 240),
      child: Row(
        children: [
          Icon(icon, size: 16, color: const Color(0xFF0097A7)),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
