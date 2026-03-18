import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../components/animated_pressable.dart';
import '../services/providers/auth_provider.dart';
import 'register_page.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _showingError = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_formKey.currentState!.validate()) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      setState(() => _showingError = false);
      
      final success = await authProvider.login(
        identifier: _identifierController.text.trim(),
        password: _passwordController.text,
      );

      if (mounted) {
        if (success) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          setState(() => _showingError = true);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(authProvider.error ?? 'Login failed'),
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
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(22),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.shield_outlined,
                                    color: Color(0xFF1E3A8A),
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  'BluePulse360',
                                  style: theme.textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text('Welcome Back', style: theme.textTheme.titleLarge),
                            const SizedBox(height: 18),
                            TextFormField(
                              controller: _identifierController,
                              decoration: const InputDecoration(
                                labelText: 'Username or Phone Number',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter username or phone number';
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
                                  icon: Icon(
                                    _obscurePassword ? Icons.visibility : Icons.visibility_off,
                                  ),
                                  onPressed: () {
                                    setState(() => _obscurePassword = !_obscurePassword);
                                  },
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Please enter password';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 240),
                              child: _showingError
                                  ? const Padding(
                                      key: ValueKey<String>('error-msg'),
                                      padding: EdgeInsets.only(bottom: 10),
                                      child: Text(
                                        'Could not authenticate. Check your credentials.',
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
                                  onTap: disabled ? null : _login,
                                  child: ElevatedButton(
                                    onPressed: disabled ? null : _login,
                                    child: authProvider.isLoading
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.4,
                                              color: Colors.white,
                                            ),
                                          )
                                        : const Text('Login'),
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
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('New user? ', style: theme.textTheme.bodyMedium),
                                TextButton(
                                  onPressed: () {
                                    Navigator.pushReplacement(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => const RegisterPage(),
                                      ),
                                    );
                                  },
                                  child: const Text('Create account'),
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
}
