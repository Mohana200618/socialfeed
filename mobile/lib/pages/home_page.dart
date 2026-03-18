import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/providers/auth_provider.dart';
import 'fisherman_dashboard.dart';
import 'volunteer_dashboard.dart';
import 'admin_dashboard.dart';
import 'login_page.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    // If no user after logout, redirect to LoginPage
    if (user == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginPage()),
          (route) => false,
        );
      });
      return const Scaffold(
        body: Center(
          child: SizedBox.shrink(),
        ),
      );
    }

    // Route to appropriate dashboard based on role
    final role = user.role.toLowerCase().trim();
    
    switch (role) {
      case 'fisherman':
        return const FishermanDashboard();
      case 'volunteer':
        return const VolunteerDashboard();
      case 'admin':
        return const AdminDashboard();
      default:
        return Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  size: 64,
                  color: Colors.red,
                ),
                const SizedBox(height: 16),
                Text(
                  'Invalid user role: "$role"',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    await authProvider.logout();
                    if (context.mounted) {
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(builder: (_) => const LoginPage()),
                        (route) => false,
                      );
                    }
                  },
                  child: const Text('Logout & Return to Login'),
                ),
              ],
            ),
          ),
        );
    }
  }
}
