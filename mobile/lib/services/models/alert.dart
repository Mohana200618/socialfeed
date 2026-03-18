class Alert {
  final int id;
  final String title;
  final String? description;
  final String alertType;
  final String severity; // red, yellow, green
  final String? location;
  final double? latitude;
  final double? longitude;
  final bool isActive;
  final DateTime createdAt;

  Alert({
    required this.id,
    required this.title,
    this.description,
    required this.alertType,
    required this.severity,
    this.location,
    this.latitude,
    this.longitude,
    required this.isActive,
    required this.createdAt,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    return Alert(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      alertType: json['alert_type'],
      severity: json['severity'],
      location: json['location'],
      latitude: json['latitude'] != null ? double.parse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.parse(json['longitude'].toString()) : null,
      isActive: json['is_active'] ?? true,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
