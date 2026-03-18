import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/animated_pressable.dart';
import '../services/providers/auth_provider.dart';
import 'login_page.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  String _selectedRole = 'fisherman';
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _showingError = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_formKey.currentState!.validate()) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      setState(() => _showingError = false);
      
      final success = await authProvider.register(
        username: _usernameController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
        password: _passwordController.text,
        role: _selectedRole,
      );

      if (mounted) {
        if (success) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          setState(() => _showingError = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(authProvider.error ?? 'Registration failed'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              Color(0xFF1E3A8A),
              Color(0xFF06B6D4),
            ],
          ),
        ),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Center(
                    child: TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 700),
                      curve: Curves.easeOutCubic,
                      builder: (context, value, child) {
                        return Opacity(
                          opacity: value,
                          child: Transform.translate(
                            offset: Offset(0, (1 - value) * 24),
                            child: child,
                          ),
                        );
                      },
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 480),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(22),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                          Text('Create Account', style: theme.textTheme.titleLarge),
                          const SizedBox(height: 16),

                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Select Role',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(child: _buildRoleOption('fisherman', 'Fisherman', Icons.phishing)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _buildRoleOption('volunteer', 'Volunteer', Icons.volunteer_activism)),
                                    const SizedBox(width: 8),
                                    Expanded(child: _buildRoleOption('admin', 'Admin', Icons.admin_panel_settings)),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _usernameController,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter username';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Phone Number',
                              prefixIcon: Icon(Icons.phone_outlined),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter phone number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                                onPressed: () {
                                  setState(() => _obscurePassword = !_obscurePassword);
                                },
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter password';
                              }
                              if (value.length < 6) {
                                return 'Password must be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirmPassword,
                            decoration: InputDecoration(
                              labelText: 'Confirm Password',
                              prefixIcon: const Icon(Icons.lock_person_outlined),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureConfirmPassword ? Icons.visibility : Icons.visibility_off,
                                ),
                                onPressed: () {
                                  setState(() => _obscureConfirmPassword = !_obscureConfirmPassword);
                                },
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please confirm password';
                              }
                              if (value != _passwordController.text) {
                                return 'Passwords do not match';
                              }
                              return null;
                            },
                          ),

                          const SizedBox(height: 12),
                          AnimatedSwitcher(
                            duration: const Duration(milliseconds: 220),
                            child: _showingError
                                ? const Padding(
                                    key: ValueKey<String>('reg-error'),
                                    padding: EdgeInsets.only(bottom: 8),
                                    child: Text(
                                      'Registration failed. Try with different details.',
                                      style: TextStyle(
                                        color: Color(0xFFDC2626),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  )
                                : const SizedBox.shrink(),
                          ),

                          Consumer<AuthProvider>(
                            builder: (context, authProvider, child) {
                              final bool disabled = authProvider.isLoading;
                              return AnimatedPressable(
                                onTap: disabled ? null : _register,
                                child: ElevatedButton(
                                  onPressed: disabled ? null : _register,
                                  child: authProvider.isLoading
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.4,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Text('Register'),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your data is private and securely protected.',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: const Color(0xFF64748B),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Already have an account? ', style: theme.textTheme.bodyMedium),
                              TextButton(
                                onPressed: () {
                                  Navigator.pushReplacement(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => const LoginPage(),
                                    ),
                                  );
                                },
                                child: const Text('Login'),
                              ),
                            ],
                          ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildRoleOption(String value, String label, IconData icon) {
    final isSelected = _selectedRole == value;
    return AnimatedPressable(
      onTap: () {
        setState(() {
          _selectedRole = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : const Color(0xFF1E3A8A),
              size: 32,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF1E3A8A),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
