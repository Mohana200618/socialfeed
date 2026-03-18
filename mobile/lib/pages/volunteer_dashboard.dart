import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../components/animated_pressable.dart';
import '../services/providers/auth_provider.dart';
import '../components/weather_widget.dart';
import '../pages/settings_page.dart';
import '../pages/user_profile_page.dart';
import '../pages/report_incident_page.dart';
import '../pages/social_feed_page.dart';
import '../pages/cluster_page.dart';
import '../pages/alerts_page.dart';
import '../pages/login_page.dart';

class VolunteerDashboard extends StatefulWidget {
  const VolunteerDashboard({super.key});

  @override
  State<VolunteerDashboard> createState() => _VolunteerDashboardState();
}

class _VolunteerDashboardState extends State<VolunteerDashboard> {
  void _makeSOSCall() async {
    final Uri phoneUri = Uri(scheme: 'tel', path: '911');
    if (await canLaunchUrl(phoneUri)) {
      await launchUrl(phoneUri);
    }
  }

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
          'Volunteer Dashboard',
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
                case 'helpline':
                  _makeSOSCall();
                  break;
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'settings', child: Text('Settings')),
              PopupMenuItem(value: 'helpline', child: Text('Helpline')),
            ],
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Weather Widget
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0, end: 1),
                duration: const Duration(milliseconds: 420),
                curve: Curves.easeOutCubic,
                builder: (context, value, child) {
                  return Opacity(
                    opacity: value,
                    child: Transform.translate(
                      offset: Offset(0, (1 - value) * 16),
                      child: child,
                    ),
                  );
                },
                child: const WeatherWidget(),
              ),
            ),

            // Four Icon Grid
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _buildMenuCard(
                    'Report Incident',
                    Icons.report_problem,
                    const Color(0xFFF97316),
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ReportIncidentPage(),
                        ),
                      );
                    },
                  ),
                  _buildMenuCard(
                    'Social Feed',
                    Icons.feed,
                    const Color(0xFF2563EB),
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SocialFeedPage(),
                        ),
                      );
                    },
                  ),
                  _buildMenuCard(
                    'Cluster',
                    Icons.group,
                    const Color(0xFF16A34A),
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ClusterPage(),
                        ),
                      );
                    },
                  ),
                  _buildMenuCard(
                    'Alerts',
                    Icons.warning,
                    const Color(0xFFDC2626),
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AlertsPage(),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuCard(
      String title,
      IconData icon,
      Color color,
      VoidCallback onTap,
      ) {
    return AnimatedPressable(
      onTap: onTap,
      child: Container(
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
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 40, color: color),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ],
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
                  child: Icon(Icons.volunteer_activism, size: 40, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.username ?? 'Volunteer',
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
