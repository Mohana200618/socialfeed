import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/models/social_post.dart';
import '../components/social_feed_card.dart';
import '../components/animated_pressable.dart';

class SocialFeedPage extends StatefulWidget {
  const SocialFeedPage({super.key});

  @override
  State<SocialFeedPage> createState() => _SocialFeedPageState();
}

class _SocialFeedPageState extends State<SocialFeedPage> {
  final ApiService _apiService = ApiService();
  final _textController = TextEditingController();
  List<SocialPost> _posts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPosts();
  }

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _loadPosts() async {
    setState(() => _isLoading = true);
    final posts = await _apiService.getSocialFeed();
    setState(() {
      _posts = posts;
      _isLoading = false;
    });
  }

  Future<void> _createPost() async {
    if (_textController.text.trim().isEmpty) return;

    final success = await _apiService.createPost(_textController.text);
    
    if (success) {
      _textController.clear();
      _loadPosts();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post created successfully')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Social Feed'),
      ),
      body: Column(
        children: [
// Create post section
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: const InputDecoration(
                        hintText: 'Share something...',
                        border: OutlineInputBorder(),
                        filled: true,
                        fillColor: Colors.white,
                      ),
                      maxLines: 2,
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedPressable(
                    onTap: _createPost,
                    child: FilledButton.tonalIcon(
                      onPressed: _createPost,
                      icon: const Icon(Icons.send),
                      label: const Text('Post'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Posts list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _posts.isEmpty
                    ? const Center(child: Text('No posts yet'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _posts.length,
                        separatorBuilder: (context, index) => const Divider(),
                        itemBuilder: (context, index) {
                          return TweenAnimationBuilder<double>(
                            tween: Tween<double>(begin: 0, end: 1),
                            duration: Duration(milliseconds: 220 + (index * 60)),
                            curve: Curves.easeOut,
                            builder: (context, value, child) {
                              return Opacity(
                                opacity: value,
                                child: Transform.translate(
                                  offset: Offset(0, (1 - value) * 10),
                                  child: child,
                                ),
                              );
                            },
                            child: SocialFeedCard(post: _posts[index]),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
