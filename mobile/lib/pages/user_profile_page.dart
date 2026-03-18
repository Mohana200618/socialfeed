import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/providers/auth_provider.dart';

class UserProfilePage extends StatelessWidget {
  const UserProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('User Profile'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                gradient: const LinearGradient(
                  colors: <Color>[Color(0xFF1E3A8A), Color(0xFF06B6D4)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 44,
                    backgroundColor: Colors.white24,
                    child: Icon(Icons.person, size: 46, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    user?.username ?? 'N/A',
                    style: theme.textTheme.titleLarge?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.role.toUpperCase() ?? 'N/A',
                    style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white70),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          _buildProfileCard(
            'Username',
            user?.username ?? 'N/A',
            Icons.person,
            1,
          ),
          
          const SizedBox(height: 12),
          
          _buildProfileCard(
            'Phone Number',
            user?.phoneNumber ?? 'N/A',
            Icons.phone,
            2,
          ),
          
          const SizedBox(height: 12),
          
          _buildProfileCard(
            'Role',
            user?.role.toUpperCase() ?? 'N/A',
            Icons.badge,
            3,
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard(String label, String value, IconData icon, int order) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: 1),
      duration: Duration(milliseconds: 240 + (order * 120)),
      curve: Curves.easeOut,
      builder: (context, valueTween, child) {
        return Opacity(
          opacity: valueTween,
          child: Transform.translate(
            offset: Offset(0, (1 - valueTween) * 14),
            child: child,
          ),
        );
      },
      child: Card(
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFE0E7FF),
            child: Icon(icon, color: const Color(0xFF1E3A8A)),
          ),
          title: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Colors.grey,
            ),
          ),
          subtitle: Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
        ),
      ),
    );
  }
}
