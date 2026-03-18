import 'package:flutter/material.dart';
import 'dart:math' as math;

class CompassWidget extends StatelessWidget {
  const CompassWidget({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock direction - in real app, use flutter_compass package
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF0097A7), width: 3),
              color: Colors.white,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Compass directions
                Positioned(
                  top: 5,
                  child: const Text(
                    'N',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0097A7),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 5,
                  child: const Text(
                    'S',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                Positioned(
                  left: 5,
                  child: const Text(
                    'W',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                Positioned(
                  right: 5,
                  child: const Text(
                    'E',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                // Needle (pointing West in this case, -112°)
                Transform.rotate(
                  angle: -112 * math.pi / 180,
                  child: CustomPaint(
                    size: const Size(50, 50),
                    painter: CompassNeedlePainter(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'W -112°',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Color(0xFF0097A7),
            ),
          ),
        ],
      ),
    );
  }
}

class CompassNeedlePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.red
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(size.width / 2, 0) // Top point
      ..lineTo(size.width / 2 + 5, size.height / 2) // Right middle
      ..lineTo(size.width / 2, size.height / 2 - 5) // Center
      ..lineTo(size.width / 2 - 5, size.height / 2) // Left middle
      ..close();

    canvas.drawPath(path, paint);

    // South part of needle (darker)
    final paintSouth = Paint()
      ..color = Colors.grey
      ..style = PaintingStyle.fill;

    final pathSouth = Path()
      ..moveTo(size.width / 2, size.height) // Bottom point
      ..lineTo(size.width / 2 + 5, size.height / 2) // Right middle
      ..lineTo(size.width / 2, size.height / 2 + 5) // Center
      ..lineTo(size.width / 2 - 5, size.height / 2) // Left middle
      ..close();

    canvas.drawPath(pathSouth, paintSouth);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => false;
}
