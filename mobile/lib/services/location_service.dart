import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:http/http.dart' as http;
import '../models/incident_models.dart';

class LocationService {
  // Try device geocoding package first (works offline if device has provider)
  static Future<String?> _reverseGeocodePackage(double lat, double lng) async {
    try {
      final placemarks = await placemarkFromCoordinates(lat, lng)
          .timeout(const Duration(seconds: 5));
      if (placemarks.isEmpty) return null;
      final place = placemarks.first;
      final parts = <String>[
        if ((place.name ?? '').trim().isNotEmpty) place.name!.trim(),
        if ((place.subLocality ?? '').trim().isNotEmpty)
          place.subLocality!.trim(),
        if ((place.locality ?? '').trim().isNotEmpty) place.locality!.trim(),
        if ((place.administrativeArea ?? '').trim().isNotEmpty)
          place.administrativeArea!.trim(),
        if ((place.country ?? '').trim().isNotEmpty) place.country!.trim(),
      ];
      final uniqueParts = <String>[];
      for (final part in parts) {
        if (!uniqueParts.contains(part)) uniqueParts.add(part);
      }
      if (uniqueParts.isEmpty) return null;
      return uniqueParts.join(', ');
    } catch (_) {
      return null;
    }
  }

  // Nominatim (OpenStreetMap) HTTP fallback — reliable when device geocoder fails
  static Future<String?> _reverseGeocodeHttp(double lat, double lng) async {
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/reverse'
        '?format=json&lat=$lat&lon=$lng&addressdetails=1',
      );
      final response = await http
          .get(uri, headers: {'User-Agent': 'BlueOceanApp/1.0'})
          .timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) return null;
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final address = data['address'] as Map<String, dynamic>?;
      if (address == null) return data['display_name'] as String?;
      final parts = <String>[
        if (address.containsKey('suburb')) address['suburb'] as String,
        if (address.containsKey('city'))
          address['city'] as String
        else if (address.containsKey('town'))
          address['town'] as String
        else if (address.containsKey('village'))
          address['village'] as String,
        if (address.containsKey('state')) address['state'] as String,
        if (address.containsKey('country')) address['country'] as String,
      ];
      if (parts.isEmpty) return data['display_name'] as String?;
      return parts.join(', ');
    } catch (_) {
      return null;
    }
  }

  /// Public: tries device geocoder first, then Nominatim HTTP fallback.
  static Future<String?> getLocationName(double lat, double lng) async {
    final fromPackage = await _reverseGeocodePackage(lat, lng);
    if (fromPackage != null && fromPackage.isNotEmpty) return fromPackage;
    return _reverseGeocodeHttp(lat, lng);
  }

  static Future<GPSLocation> getCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled.');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied.');
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    final locationName = await getLocationName(
      position.latitude,
      position.longitude,
    );

    return GPSLocation(
      latitude: position.latitude,
      longitude: position.longitude,
      locationName: locationName,
      accuracy: position.accuracy,
    );
  }

  static String formatCoordinates(double lat, double lng) {
    final latDir = lat >= 0 ? 'N' : 'S';
    final lngDir = lng >= 0 ? 'E' : 'W';
    return '${lat.abs().toStringAsFixed(6)}° $latDir, '
        '${lng.abs().toStringAsFixed(6)}° $lngDir';
  }
}
