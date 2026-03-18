enum IncidentCategory {
  illegalFishing,
  pollution,
  distressSignal,
  weatherHazard,
  tsunami,
  cyclone,
  stormSurge,
  rogueWaves,
  highWinds,
  flooding,
  oilSpill,
  fireOnVessel,
  equipmentFailure,
  collision,
  other;

  String get displayName {
    switch (this) {
      case IncidentCategory.illegalFishing:
        return 'Illegal Fishing';
      case IncidentCategory.pollution:
        return 'Pollution';
      case IncidentCategory.distressSignal:
        return 'Distress Signal';
      case IncidentCategory.weatherHazard:
        return 'Weather Hazard';
      case IncidentCategory.tsunami:
        return 'Tsunami';
      case IncidentCategory.cyclone:
        return 'Cyclone';
      case IncidentCategory.stormSurge:
        return 'Storm Surge';
      case IncidentCategory.rogueWaves:
        return 'Rogue Waves';
      case IncidentCategory.highWinds:
        return 'High Winds';
      case IncidentCategory.flooding:
        return 'Flooding';
      case IncidentCategory.oilSpill:
        return 'Oil Spill';
      case IncidentCategory.fireOnVessel:
        return 'Fire On Vessel';
      case IncidentCategory.equipmentFailure:
        return 'Equipment Failure';
      case IncidentCategory.collision:
        return 'Collision';
      case IncidentCategory.other:
        return 'Other';
    }
  }
}

class GPSLocation {
  final double latitude;
  final double longitude;
  final String? locationName;
  final double? accuracy;

  GPSLocation({
    required this.latitude,
    required this.longitude,
    this.locationName,
    this.accuracy,
  });
}

enum MediaType { image, video, audio }

class MediaAttachment {
  final MediaType type;
  final String? localPath;
  final String? fileName;
  final DateTime? capturedAt;
  final double? latitude;
  final double? longitude;
  final String? locationName;

  MediaAttachment({
    required this.type,
    this.localPath,
    this.fileName,
    this.capturedAt,
    this.latitude,
    this.longitude,
    this.locationName,
  });

  bool get hasGeoTag =>
      capturedAt != null && latitude != null && longitude != null;
}

class IncidentReport {
  final String id;
  final IncidentCategory category;
  final GPSLocation location;
  final String description;
  final List<MediaAttachment> mediaAttachments;
  final DateTime timestamp;
  final String reporterId;
  final String reporterName;

  IncidentReport({
    required this.id,
    required this.category,
    required this.location,
    required this.description,
    required this.mediaAttachments,
    required this.timestamp,
    required this.reporterId,
    required this.reporterName,
  });

  Map<String, dynamic> toJson() {
    return {
      'title': '${category.displayName} Incident',
      'description': description,
      'incidentType': category.displayName,
      'location': location.locationName,
      'latitude': location.latitude,
      'longitude': location.longitude,
    };
  }
}
