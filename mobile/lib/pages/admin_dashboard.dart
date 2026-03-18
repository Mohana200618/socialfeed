import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/animated_pressable.dart';
import '../services/providers/auth_provider.dart';
import '../pages/settings_page.dart';
import '../pages/user_profile_page.dart';
import '../pages/social_feed_page.dart';
import '../pages/cluster_page.dart';
import '../pages/manage_alerts_page.dart';
import '../pages/incident_management_page.dart';
import '../pages/login_page.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  void _logout() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Logout error: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        leading: Builder(
          builder: (BuildContext context) {
            return IconButton(
              icon: const Icon(Icons.menu, color: Color(0xFF0F172A)),
              onPressed: () {
                Scaffold.of(context).openDrawer();
              },
            );
          },
        ),
        title: const Text(
          'Admin Dashboard',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w700),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Color(0xFF0F172A)),
            position: PopupMenuPosition.under,
            onSelected: (value) {
              switch (value) {
                case 'settings':
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const SettingsPage()),
                  );
                  break;
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'settings', child: Text('Settings')),
            ],
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildMenuCard('Social Feed', Icons.feed, const Color(0xFF2563EB), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SocialFeedPage()),
            );
          }),
          _buildMenuCard('Incident Management', Icons.report_problem, const Color(0xFFF97316), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const IncidentManagementPage()),
            );
          }),
          _buildMenuCard('Cluster', Icons.group, const Color(0xFF16A34A), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ClusterPage()),
            );
          }),
          _buildMenuCard('Manage Alerts', Icons.warning, const Color(0xFFDC2626), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ManageAlertsPage()),
            );
          }),
          _buildMenuCard('Send Alerts', Icons.send, const Color(0xFF7C3AED), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ManageAlertsPage()),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildMenuCard(String title, IconData icon, Color color, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AnimatedPressable(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0x120F172A),
                blurRadius: 10,
                offset: Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer() {
    final user = Provider.of<AuthProvider>(context).user;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: <Color>[Color(0xFF1E3A8A), Color(0xFF06B6D4)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.admin_panel_settings, size: 40, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.username ?? 'Admin',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  user?.phoneNumber ?? '',
                  style: const TextStyle(color: Colors.white70),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('User Profile'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const UserProfilePage()),
              );
            },
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Color(0xFFB42318)),
            title: const Text('Logout'),
            textColor: const Color(0xFFB42318),
            onTap: () {
              Navigator.pop(context);
              _logout();
            },
          ),
        ],
      ),
    );
  }
}
