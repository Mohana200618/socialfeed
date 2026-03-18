import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class ApiConfig {
  // LAN backend host for devices on same Wi-Fi.
  static const String mobileLanBaseUrl = 'http://192.168.1.36:5000/api';

  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:5000/api';
    if (Platform.isAndroid || Platform.isIOS) return mobileLanBaseUrl;
    return 'http://localhost:5000/api';
  }

  // Auth endpoints
  static String get register => '$baseUrl/auth/register';
  static String get login => '$baseUrl/auth/login';
  static String get getProfile => '$baseUrl/auth/me';

  // Resource endpoints
  static String get alerts => '$baseUrl/alerts';
  static String get topAlerts => '$baseUrl/alerts/top';
  static String get incidents => '$baseUrl/incidents';
  static String get socialFeed => '$baseUrl/social-feed';
  static String get clusters => '$baseUrl/clusters';
  static String get fishingZones => '$baseUrl/fishing-zones';
  static String get settings => '$baseUrl/settings';

  // Border alert endpoints
  static String get checkBorder => '$baseUrl/border/check-border';
  static String get borderPoints => '$baseUrl/border/points';
}
