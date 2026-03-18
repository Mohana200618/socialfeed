import 'package:flutter/material.dart';
import '../services/models/social_post.dart';
import 'package:intl/intl.dart';

class SocialFeedCard extends StatelessWidget {
  final SocialPost post;

  const SocialFeedCard({
    super.key,
    required this.post,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                backgroundColor: Colors.teal,
                child: Text(
                  post.username?[0].toUpperCase() ?? 'U',
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      post.username ?? 'User',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      DateFormat('MMM dd, yyyy HH:mm').format(post.createdAt),
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            post.content,
            style: const TextStyle(fontSize: 13),
          ),
          if (post.imageUrl != null) ...[
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                post.imageUrl!,
                width: double.infinity,
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    height: 200,
                    color: Colors.grey[300],
                    child: const Center(
                      child: Icon(Icons.image_not_supported),
                    ),
                  );
                },
              ),
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.thumb_up_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text('${post.likesCount}', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(width: 16),
              Icon(Icons.comment_outlined, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 4),
              Text('${post.commentsCount}', style: TextStyle(color: Colors.grey[600])),
            ],
          ),
        ],
      ),
    );
  }
}
