class User {
  final int id;
  final String username;
  final String phoneNumber;
  final String role;

  User({
    required this.id,
    required this.username,
    required this.phoneNumber,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      role: json['role'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'phoneNumber': phoneNumber,
      'role': role,
    };
  }
}
