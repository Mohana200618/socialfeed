class Incident {
  final int id;
  final String title;
  final String? description;
  final String? incidentType;
  final String? location;
  final double? latitude;
  final double? longitude;
  final String status;
  final String? reporterName;
  final DateTime createdAt;
  final List<IncidentMediaAttachment> mediaAttachments;

  Incident({
    required this.id,
    required this.title,
    this.description,
    this.incidentType,
    this.location,
    this.latitude,
    this.longitude,
    required this.status,
    this.reporterName,
    required this.createdAt,
    this.mediaAttachments = const [],
  });

  factory Incident.fromJson(Map<String, dynamic> json) {
    return Incident(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      incidentType: json['incident_type'],
      location: json['location'],
      latitude: json['latitude'] != null ? double.parse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.parse(json['longitude'].toString()) : null,
      status: json['status'],
      reporterName: json['reporter_name'],
      createdAt: DateTime.parse(json['created_at']),
      mediaAttachments: (json['media_attachments'] as List<dynamic>? ?? const [])
          .map((item) => IncidentMediaAttachment.fromJson(item))
          .toList(),
    );
  }
}

class IncidentMediaAttachment {
  final String id;
  final String type;
  final String url;
  final String? fileName;
  final String? mimeType;
  final int? size;
  final DateTime? capturedAt;
  final DateTime? uploadedAt;
  final double? latitude;
  final double? longitude;
  final String? locationName;

  IncidentMediaAttachment({
    required this.id,
    required this.type,
    required this.url,
    this.fileName,
    this.mimeType,
    this.size,
    this.capturedAt,
    this.uploadedAt,
    this.latitude,
    this.longitude,
    this.locationName,
  });

  factory IncidentMediaAttachment.fromJson(Map<String, dynamic> json) {
    return IncidentMediaAttachment(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? 'file').toString(),
      url: (json['url'] ?? '').toString(),
      fileName: json['fileName']?.toString(),
      mimeType: json['mimeType']?.toString(),
      size: json['size'] is int ? json['size'] as int : int.tryParse('${json['size']}'),
        capturedAt: json['capturedAt'] == null
          ? null
          : DateTime.tryParse(json['capturedAt'].toString()),
      uploadedAt: json['uploadedAt'] == null
          ? null
          : DateTime.tryParse(json['uploadedAt'].toString()),
      latitude:
          json['latitude'] is num ? (json['latitude'] as num).toDouble() : null,
      longitude:
          json['longitude'] is num ? (json['longitude'] as num).toDouble() : null,
      locationName: json['locationName']?.toString(),
    );
  }

  bool get isImage {
    final normalizedType = type.toLowerCase();
    final normalizedMime = (mimeType ?? '').toLowerCase();
    final normalizedName = (fileName ?? url).toLowerCase();
    return normalizedType == 'image' ||
        normalizedMime.startsWith('image/') ||
        normalizedName.endsWith('.jpg') ||
        normalizedName.endsWith('.jpeg') ||
        normalizedName.endsWith('.png') ||
        normalizedName.endsWith('.gif') ||
        normalizedName.endsWith('.webp');
  }

  bool get isVideo {
    final normalizedType = type.toLowerCase();
    final normalizedMime = (mimeType ?? '').toLowerCase();
    final normalizedName = (fileName ?? url).toLowerCase();
    return normalizedType == 'video' ||
        normalizedMime.startsWith('video/') ||
        normalizedName.endsWith('.mp4') ||
        normalizedName.endsWith('.mov') ||
        normalizedName.endsWith('.webm') ||
        normalizedName.endsWith('.avi');
  }

  bool get isAudio {
    final normalizedType = type.toLowerCase();
    final normalizedMime = (mimeType ?? '').toLowerCase();
    final normalizedName = (fileName ?? url).toLowerCase();
    return normalizedType == 'audio' ||
        normalizedMime.startsWith('audio/') ||
        normalizedName.endsWith('.mp3') ||
        normalizedName.endsWith('.wav') ||
        normalizedName.endsWith('.m4a') ||
        normalizedName.endsWith('.aac');
  }
  bool get hasGeoTag => latitude != null && longitude != null;
}
