import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/models/alert.dart';
import '../services/models/social_post.dart';
import '../components/weather_widget.dart';
import '../components/compass_widget.dart';
import '../components/alert_card.dart';
import '../components/social_feed_card.dart';
import '../pages/settings_page.dart';
import '../pages/user_profile_page.dart';
import '../pages/fishing_zone_page.dart';
import '../pages/cluster_page.dart';
import '../pages/alerts_page.dart';
import '../pages/report_incident_page.dart';
import '../pages/social_feed_page.dart';
import '../components/animated_pressable.dart';
import '../pages/login_page.dart';
import '../pages/border_alert_page.dart';

class FishermanDashboard extends StatefulWidget {
  const FishermanDashboard({super.key});

  @override
  State<FishermanDashboard> createState() => _FishermanDashboardState();
}

class _FishermanDashboardState extends State<FishermanDashboard> {
  final ApiService _apiService = ApiService();
  List<Alert> _topAlerts = [];
  List<SocialPost> _recentPosts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);

    final alerts = await _apiService.getTopAlerts(limit: 3);
    final posts = await _apiService.getSocialFeed(limit: 5);

    if (!mounted) return;

    setState(() {
      _topAlerts = alerts;
      _recentPosts = posts;
      _isLoading = false;
    });
  }

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

  Widget _buildSectionContainer({required Widget child}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const <BoxShadow>[
          BoxShadow(
            color: Color(0x110F172A),
            blurRadius: 12,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
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
          'Fisherman Dashboard',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.w700,
          ),
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
                    MaterialPageRoute(
                      builder: (context) => const SettingsPage(),
                    ),
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
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              // Top Section: Weather and Compass
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 450),
                  curve: Curves.easeOutCubic,
                  builder: (context, value, child) {
                    return Opacity(
                      opacity: value,
                      child: Transform.translate(
                        offset: Offset(0, (1 - value) * 18),
                        child: child,
                      ),
                    );
                  },
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final bool compact = constraints.maxWidth < 380;
                      if (compact) {
                        return Column(
                          children: const [
                            WeatherWidget(),
                            SizedBox(height: 12),
                            CompassWidget(),
                          ],
                        );
                      }

                      return Row(
                        children: [
                          const Expanded(flex: 3, child: WeatherWidget()),
                          const SizedBox(width: 16),
                          const Expanded(flex: 2, child: CompassWidget()),
                        ],
                      );
                    },
                  ),
                ),
              ),

              // Official Alerts Section
              _buildSectionContainer(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.warning_amber, color: Colors.red),
                        const SizedBox(width: 8),
                        const Text(
                          'OFFICIAL ALERTS - DANGER',
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : _topAlerts.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Text('No active alerts'),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _topAlerts.length,
                            separatorBuilder: (context, index) =>
                                const SizedBox(height: 8),
                            itemBuilder: (context, index) {
                              final alert = _topAlerts[index];
                              return TweenAnimationBuilder<double>(
                                tween: Tween<double>(begin: 0, end: 1),
                                duration: Duration(
                                  milliseconds: 280 + (index * 90),
                                ),
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
                                child: AlertCard(
                                  alert: alert,
                                  index: index + 1,
                                ),
                              );
                            },
                          ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Report Incident Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: AnimatedPressable(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const ReportIncidentPage(),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Center(
                      child: Text(
                        'REPORT INCIDENT',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Border Alert Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: AnimatedPressable(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const BorderAlertPage(),
                        ),
                      );
                    },
                    icon: const Icon(
                      Icons.dangerous_rounded,
                      color: Colors.white,
                    ),
                    label: const Center(
                      child: Text(
                        'BORDER ALERT CHECK',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.3,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Social Feed Section
              _buildSectionContainer(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Social Feed',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const SocialFeedPage(),
                              ),
                            );
                          },
                          child: const Text('View All'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : _recentPosts.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: Text('No posts yet'),
                            ),
                          )
                        : ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _recentPosts.length,
                            separatorBuilder: (context, index) =>
                                const Divider(),
                            itemBuilder: (context, index) {
                              return TweenAnimationBuilder<double>(
                                tween: Tween<double>(begin: 0, end: 1),
                                duration: Duration(
                                  milliseconds: 260 + (index * 75),
                                ),
                                curve: Curves.easeOut,
                                builder: (context, value, child) {
                                  return Opacity(
                                    opacity: value,
                                    child: Transform.translate(
                                      offset: Offset((1 - value) * 6, 0),
                                      child: child,
                                    ),
                                  );
                                },
                                child: SocialFeedCard(
                                  post: _recentPosts[index],
                                ),
                              );
                            },
                          ),
                  ],
                ),
              ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _makeSOSCall,
        label: const Text('SOS'),
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
                  backgroundColor: Colors.white,
                  child: Icon(Icons.person, size: 40, color: Color(0xFF1E3A8A)),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.username ?? 'Fisherman',
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
                MaterialPageRoute(
                  builder: (context) => const UserProfilePage(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.anchor),
            title: const Text('Fishing Zone'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const FishingZonePage(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.group),
            title: const Text('Cluster'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ClusterPage()),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.warning, color: Colors.red),
            title: const Text('Border Alert'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const BorderAlertPage(),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.warning_amber, color: Colors.orange),
            title: const Text('Warning Alert'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AlertsPage(alertType: 'warning'),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.waves),
            title: const Text('Tidal Prediction'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AlertsPage(alertType: 'tidal'),
                ),
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
