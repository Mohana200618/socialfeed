class Cluster {
  final int id;
  final String name;
  final String? description;
  final String? location;
  final double? latitude;
  final double? longitude;
  final String? coordinatorName;

  Cluster({
    required this.id,
    required this.name,
    this.description,
    this.location,
    this.latitude,
    this.longitude,
    this.coordinatorName,
  });

  factory Cluster.fromJson(Map<String, dynamic> json) {
    return Cluster(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      location: json['location'],
      latitude: json['latitude'] != null ? double.parse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.parse(json['longitude'].toString()) : null,
      coordinatorName: json['coordinator_name'],
    );
  }
}
