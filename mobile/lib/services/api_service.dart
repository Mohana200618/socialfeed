import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';
import 'models/alert.dart';
import 'models/incident.dart';
import 'models/social_post.dart';
import 'models/cluster.dart';
import 'models/user_settings.dart';
import '../models/incident_models.dart';

class ApiService {
  final AuthService _authService = AuthService();

  Future<Map<String, String>> _getHeaders() async {
    final token = await _authService.getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Alerts
  Future<List<Alert>> getTopAlerts({int limit = 3}) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.topAlerts}?limit=$limit'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((json) => Alert.fromJson(json))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching alerts: $e');
      return [];
    }
  }

  Future<List<Alert>> getAllAlerts() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.alerts),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((json) => Alert.fromJson(json))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching all alerts: $e');
      return [];
    }
  }

  Future<bool> createAlert(Map<String, dynamic> alertData) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.alerts),
        headers: await _getHeaders(),
        body: jsonEncode(alertData),
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error creating alert: $e');
      return false;
    }
  }

  // Incidents
  Future<List<Incident>> getAllIncidents() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.incidents),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((json) => Incident.fromJson(json))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching incidents: $e');
      return [];
    }
  }

  Future<bool> createIncident(Map<String, dynamic> incidentData) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.incidents),
        headers: await _getHeaders(),
        body: jsonEncode(incidentData),
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error creating incident: $e');
      return false;
    }
  }

  String _getMimeType(MediaType type) {
    switch (type) {
      case MediaType.image:
        return 'image/jpeg';
      case MediaType.video:
        return 'video/mp4';
      case MediaType.audio:
        return 'audio/mpeg';
    }
  }

  Future<bool> createIncidentWithAttachments({
    required Map<String, dynamic> incidentData,
    required List<MediaAttachment> attachments,
  }) async {
    try {
      final headers = await _getHeaders();
      final token = await _authService.getToken();

      final createResponse = await http.post(
        Uri.parse(ApiConfig.incidents),
        headers: headers,
        body: jsonEncode(incidentData),
      );

      if (createResponse.statusCode != 201) {
        return false;
      }

      final createPayload = jsonDecode(createResponse.body);
      final incidentId = createPayload['data']?['id'];
      if (incidentId == null) {
        return false;
      }

      final uploadable = attachments
          .where(
            (item) =>
                item.localPath != null && item.localPath!.trim().isNotEmpty,
          )
          .toList();

      if (uploadable.isEmpty) {
        return true;
      }

      if (kIsWeb) {
        return true;
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConfig.incidents}/$incidentId/media'),
      );

      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      final mediaTypes = <String>[];
      final geoTags = <Map<String, dynamic>>[];
      for (final item in uploadable) {
        final path = item.localPath!;
        final mimeType = _getMimeType(item.type);
        request.files.add(
          await http.MultipartFile.fromPath(
            'files',
            path,
            filename: item.fileName,
            contentType: http.MediaType.parse(mimeType),
          ),
        );
        mediaTypes.add(item.type.name);
        geoTags.add({
          'latitude': item.latitude,
          'longitude': item.longitude,
          'locationName': item.locationName,
          'capturedAt': item.capturedAt?.toIso8601String(),
        });
      }

      request.fields['mediaTypes'] = jsonEncode(mediaTypes);
      request.fields['geoTags'] = jsonEncode(geoTags);

      final uploadResponse = await request.send();
      return uploadResponse.statusCode == 201 ||
          uploadResponse.statusCode == 200;
    } catch (e) {
      print('Error creating incident with attachments: $e');
      return false;
    }
  }

  Future<bool> updateIncidentStatus(int id, String status) async {
    try {
      final response = await http.put(
        Uri.parse('${ApiConfig.incidents}/$id'),
        headers: await _getHeaders(),
        body: jsonEncode({'status': status}),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error updating incident: $e');
      return false;
    }
  }

  // Social Feed
  Future<List<SocialPost>> getSocialFeed({int limit = 50}) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.socialFeed}?limit=$limit'),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((json) => SocialPost.fromJson(json))
              .toList();
        }
      }
      return [];
    } catch (e) {
      print('Error fetching social feed: $e');
      return [];
    }
  }

  Future<bool> createPost(String content, {String? imageUrl}) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.socialFeed),
        headers: await _getHeaders(),
        body: jsonEncode({
          'content': content,
          if (imageUrl != null) 'imageUrl': imageUrl,
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      print('Error creating post: $e');
      return false;
    }
  }

  // Clusters
  Future<List<Cluster>> getAllClusters() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.clusters),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((j) => Cluster.fromJson(j))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching clusters: $e');
      return [];
    }
  }

  Future<List<Cluster>> getMyClusters(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.clusters}/my-clusters?userId=$userId'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return (data['data'] as List)
              .map((j) => Cluster.fromJson(j))
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching my clusters: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> autoJoinCluster(
    int userId,
    double lat,
    double lng,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.clusters}/auto-join'),
        headers: await _getHeaders(),
        body: jsonEncode({
          'userId': userId,
          'lat': lat,
          'lng': lng,
          'radiusKm': 50,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) return data['data'] as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Error auto-joining cluster: $e');
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> getClusterMembers(int clusterId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.clusters}/$clusterId/members'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return List<Map<String, dynamic>>.from(data['data']);
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching cluster members: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getClusterNotifications(
    int clusterId,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.clusters}/$clusterId/notifications?limit=30'),
        headers: await _getHeaders(),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return List<Map<String, dynamic>>.from(data['data']);
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching cluster notifications: $e');
      return [];
    }
  }

  Future<bool> broadcastToCluster(
    int clusterId,
    String message,
    String type,
    int? sentBy,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.clusters}/$clusterId/broadcast'),
        headers: await _getHeaders(),
        body: jsonEncode({'message': message, 'type': type, 'sentBy': sentBy}),
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error broadcasting to cluster: $e');
      return false;
    }
  }

  // Settings
  Future<UserSettings?> getUserSettings() async {
    try {
      final response = await http.get(
        Uri.parse(ApiConfig.settings),
        headers: await _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success']) {
          return UserSettings.fromJson(data['data']);
        }
      }
      return null;
    } catch (e) {
      print('Error fetching settings: $e');
      return null;
    }
  }

  Future<bool> updateUserSettings(UserSettings settings) async {
    try {
      final response = await http.put(
        Uri.parse(ApiConfig.settings),
        headers: await _getHeaders(),
        body: jsonEncode(settings.toJson()),
      );
      return response.statusCode == 200;
    } catch (e) {
      print('Error updating settings: $e');
      return false;
    }
  }
}
