import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../components/animated_pressable.dart';

class ManageAlertsPage extends StatefulWidget {
  const ManageAlertsPage({super.key});

  @override
  State<ManageAlertsPage> createState() => _ManageAlertsPageState();
}

class _ManageAlertsPageState extends State<ManageAlertsPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final ApiService _apiService = ApiService();
  
  String _selectedType = 'border';
  String _selectedSeverity = 'red';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _createAlert() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isSubmitting = true);

      final success = await _apiService.createAlert({
        'title': _titleController.text,
        'description': _descriptionController.text,
        'alertType': _selectedType,
        'severity': _selectedSeverity,
        'location': _locationController.text,
      });

      setState(() => _isSubmitting = false);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Alert created successfully'),
              backgroundColor: Colors.green,
            ),
          );
          _titleController.clear();
          _descriptionController.clear();
          _locationController.clear();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to create alert'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Alerts'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Alert Title',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedType,
              decoration: const InputDecoration(
                labelText: 'Alert Type',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'border', child: Text('Border Alert')),
                DropdownMenuItem(value: 'warning', child: Text('Warning Alert')),
                DropdownMenuItem(value: 'tidal', child: Text('Tidal Prediction')),
                DropdownMenuItem(value: 'weather', child: Text('Weather Alert')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedType = value);
                }
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _selectedSeverity,
              decoration: const InputDecoration(
                labelText: 'Severity',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'red', child: Text('Red (Danger)')),
                DropdownMenuItem(value: 'yellow', child: Text('Yellow (Warning)')),
                DropdownMenuItem(value: 'green', child: Text('Green (Safe)')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedSeverity = value);
                }
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'Location',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),
            AnimatedPressable(
              onTap: _isSubmitting ? null : _createAlert,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _createAlert,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      )
                    : const Text(
                        'Create Alert',
                        style: TextStyle(fontSize: 16, color: Colors.white),
                      ),
              ),
            ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
