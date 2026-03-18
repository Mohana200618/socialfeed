import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class BorderCheckResult {
  final double lat;
  final double lng;
  final String nearestBorderPoint;
  final double distanceKm;
  final String status; // 'SAFE' | 'WARNING' | 'DANGER'
  final String message;
  final String? safeDirection;
  final String? escapeInstruction;

  const BorderCheckResult({
    required this.lat,
    required this.lng,
    required this.nearestBorderPoint,
    required this.distanceKm,
    required this.status,
    required this.message,
    this.safeDirection,
    this.escapeInstruction,
  });

  factory BorderCheckResult.fromJson(Map<String, dynamic> json) {
    return BorderCheckResult(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      nearestBorderPoint: json['nearestBorderPoint'] as String? ?? '',
      distanceKm: (json['distanceKm'] as num).toDouble(),
      status: json['status'] as String,
      message: json['message'] as String,
      safeDirection: json['safeDirection'] as String?,
      escapeInstruction: json['escapeInstruction'] as String?,
    );
  }
}

class BorderService {
  final http.Client _client;
  BorderService({http.Client? client}) : _client = client ?? http.Client();

  Future<BorderCheckResult> checkBorder(double lat, double lng) async {
    final uri = Uri.parse(ApiConfig.checkBorder);

    final response = await _client
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'lat': lat, 'lng': lng}),
        )
        .timeout(const Duration(seconds: 15));

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(
        body['error'] ?? 'Border check failed (${response.statusCode})',
      );
    }

    final json = jsonDecode(response.body) as Map<String, dynamic>;
    return BorderCheckResult.fromJson(json['data'] as Map<String, dynamic>);
  }
}
