class UserSettings {
  final String language;
  final int volume;
  final int brightness;
  final bool notificationsEnabled;

  UserSettings({
    required this.language,
    required this.volume,
    required this.brightness,
    required this.notificationsEnabled,
  });

  factory UserSettings.fromJson(Map<String, dynamic> json) {
    return UserSettings(
      language: json['language'] ?? 'en',
      volume: json['volume'] ?? 50,
      brightness: json['brightness'] ?? 50,
      notificationsEnabled: json['notifications_enabled'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'language': language,
      'volume': volume,
      'brightness': brightness,
      'notificationsEnabled': notificationsEnabled,
    };
  }

  UserSettings copyWith({
    String? language,
    int? volume,
    int? brightness,
    bool? notificationsEnabled,
  }) {
    return UserSettings(
      language: language ?? this.language,
      volume: volume ?? this.volume,
      brightness: brightness ?? this.brightness,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
    );
  }
}
