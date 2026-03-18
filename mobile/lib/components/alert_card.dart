import 'package:flutter/material.dart';
import '../services/models/alert.dart';

class AlertCard extends StatelessWidget {
  final Alert alert;
  final int index;

  const AlertCard({
    super.key,
    required this.alert,
    required this.index,
  });

  Color _getSeverityColor() {
    switch (alert.severity.toLowerCase()) {
      case 'red':
        return Colors.red;
      case 'yellow':
        return Colors.amber;
      case 'green':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _getSeverityColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _getSeverityColor(), width: 2),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _getSeverityColor(),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '$index.',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title.toUpperCase(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _getSeverityColor(),
                    fontSize: 14,
                  ),
                ),
                if (alert.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    alert.description!,
                    style: const TextStyle(fontSize: 12, color: Colors.black87),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
