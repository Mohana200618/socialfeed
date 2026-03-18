class SocialPost {
  final int id;
  final int userId;
  final String content;
  final String? imageUrl;
  final int likesCount;
  final int commentsCount;
  final String? username;
  final String? role;
  final DateTime createdAt;

  SocialPost({
    required this.id,
    required this.userId,
    required this.content,
    this.imageUrl,
    required this.likesCount,
    required this.commentsCount,
    this.username,
    this.role,
    required this.createdAt,
  });

  factory SocialPost.fromJson(Map<String, dynamic> json) {
    return SocialPost(
      id: json['id'],
      userId: json['user_id'],
      content: json['content'],
      imageUrl: json['image_url'],
      likesCount: json['likes_count'] ?? 0,
      commentsCount: json['comments_count'] ?? 0,
      username: json['username'],
      role: json['role'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
