import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/models/user_settings.dart';
import '../components/animated_pressable.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  final ApiService _apiService = ApiService();
  UserSettings? _settings;
  bool _isLoading = true;
  
  String _selectedLanguage = 'en';
  double _volume = 50;
  double _brightness = 50;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final settings = await _apiService.getUserSettings();
    if (settings != null) {
      setState(() {
        _settings = settings;
        _selectedLanguage = settings.language;
        _volume = settings.volume.toDouble();
        _brightness = settings.brightness.toDouble();
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveSettings() async {
    final newSettings = UserSettings(
      language: _selectedLanguage,
      volume: _volume.round(),
      brightness: _brightness.round(),
      notificationsEnabled: _settings?.notificationsEnabled ?? true,
    );

    final success = await _apiService.updateUserSettings(newSettings);
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success ? 'Settings saved' : 'Failed to save settings'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Language Setting
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 280),
                  builder: (context, value, child) {
                    return Opacity(
                      opacity: value,
                      child: Transform.translate(
                        offset: Offset((1 - value) * 10, 0),
                        child: child,
                      ),
                    );
                  },
                  child: Card(
                    child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.language, color: Color(0xFF1E3A8A)),
                            const SizedBox(width: 12),
                            const Text(
                              'Language',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedLanguage,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'en', child: Text('English')),
                            DropdownMenuItem(value: 'ta', child: Text('Tamil')),
                            DropdownMenuItem(value: 'hi', child: Text('Hindi')),
                          ],
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _selectedLanguage = value);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                ),

                const SizedBox(height: 16),

                // Volume Setting
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 360),
                  builder: (context, value, child) {
                    return Opacity(
                      opacity: value,
                      child: Transform.translate(
                        offset: Offset((1 - value) * 10, 0),
                        child: child,
                      ),
                    );
                  },
                  child: Card(
                    child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.volume_up, color: Color(0xFF1E3A8A)),
                            const SizedBox(width: 12),
                            const Text(
                              'Volume',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_volume.round()}%',
                              style: const TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1E3A8A),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Slider(
                          value: _volume,
                          min: 0,
                          max: 100,
                          divisions: 100,
                          activeColor: const Color(0xFF1E3A8A),
                          onChanged: (value) {
                            setState(() => _volume = value);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                ),

                const SizedBox(height: 16),

                // Brightness Setting
                TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 460),
                  builder: (context, value, child) {
                    return Opacity(
                      opacity: value,
                      child: Transform.translate(
                        offset: Offset((1 - value) * 10, 0),
                        child: child,
                      ),
                    );
                  },
                  child: Card(
                    child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.brightness_6, color: Color(0xFF1E3A8A)),
                            const SizedBox(width: 12),
                            const Text(
                              'Brightness',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_brightness.round()}%',
                              style: const TextStyle(
                                fontSize: 16,
                                color: Color(0xFF1E3A8A),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Slider(
                          value: _brightness,
                          min: 0,
                          max: 100,
                          divisions: 100,
                          activeColor: const Color(0xFF1E3A8A),
                          onChanged: (value) {
                            setState(() => _brightness = value);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                ),

                const SizedBox(height: 24),

                // Save Button
                AnimatedPressable(
                  onTap: _saveSettings,
                  child: ElevatedButton(
                    onPressed: _saveSettings,
                    child: const Text(
                      'Save Settings',
                      style: TextStyle(fontSize: 16, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
