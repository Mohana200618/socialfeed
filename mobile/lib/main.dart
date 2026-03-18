import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/providers/auth_provider.dart';
import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/register_page.dart';
import 'pages/fisherman_dashboard.dart';
import 'pages/volunteer_dashboard.dart';
import 'pages/admin_dashboard.dart';
import 'pages/settings_page.dart';
import 'pages/user_profile_page.dart';
import 'pages/fishing_zone_page.dart';
import 'pages/cluster_page.dart';
import 'pages/alerts_page.dart';
import 'pages/report_incident_page.dart';
import 'pages/social_feed_page.dart';
import 'pages/incident_management_page.dart';
import 'pages/manage_alerts_page.dart';
import 'pages/border_alert_page.dart';
import 'theme/mobile_app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => AuthProvider()..loadUser(),
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final Map<String, WidgetBuilder> appRoutes = {
            '/home': (context) => const HomePage(),
            '/login': (context) => const LoginPage(),
            '/register': (context) => const RegisterPage(),
            '/fisherman': (context) => const FishermanDashboard(),
            '/volunteer': (context) => const VolunteerDashboard(),
            '/admin': (context) => const AdminDashboard(),
            '/settings': (context) => const SettingsPage(),
            '/profile': (context) => const UserProfilePage(),
            '/fishing-zone': (context) => const FishingZonePage(),
            '/cluster': (context) => const ClusterPage(),
            '/alerts': (context) => const AlertsPage(),
            '/report-incident': (context) => const ReportIncidentPage(),
            '/social-feed': (context) => const SocialFeedPage(),
            '/incident-management': (context) => const IncidentManagementPage(),
            '/manage-alerts': (context) => const ManageAlertsPage(),
            '/border-alert': (context) => const BorderAlertPage(),
          };

          return MaterialApp(
            title: 'Fisherman Safety App',
            debugShowCheckedModeBanner: false,
            theme: MobileAppTheme.light,
            home: authProvider.isAuthenticated
                ? const HomePage()
                : const LoginPage(),
            onGenerateRoute: (settings) {
              final builder = appRoutes[settings.name];
              if (builder == null) return null;

              return PageRouteBuilder<void>(
                settings: settings,
                transitionDuration: const Duration(milliseconds: 380),
                reverseTransitionDuration: const Duration(milliseconds: 280),
                pageBuilder: (context, animation, secondaryAnimation) =>
                    builder(context),
                transitionsBuilder:
                    (context, animation, secondaryAnimation, child) {
                      final curved = CurvedAnimation(
                        parent: animation,
                        curve: Curves.easeOutCubic,
                        reverseCurve: Curves.easeInCubic,
                      );

                      return FadeTransition(
                        opacity: curved,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0, 0.03),
                            end: Offset.zero,
                          ).animate(curved),
                          child: child,
                        ),
                      );
                    },
              );
            },
          );
        },
      ),
    );
  }
}
