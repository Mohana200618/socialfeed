import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/models/alert.dart';
import '../components/alert_card.dart';

class AlertsPage extends StatefulWidget {
  final String? alertType;
  
  const AlertsPage({super.key, this.alertType});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> {
  final ApiService _apiService = ApiService();
  List<Alert> _alerts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
  }

  Future<void> _loadAlerts() async {
    setState(() => _isLoading = true);
    final alerts = await _apiService.getAllAlerts();
   
    // Filter by type if specified
    final filteredAlerts = widget.alertType != null
        ? alerts.where((a) => a.alertType == widget.alertType).toList()
        : alerts;
    
    setState(() {
      _alerts = filteredAlerts;
      _isLoading = false;
    });
  }

  String _getTitle() {
    switch (widget.alertType) {
      case 'border':
        return 'Border Alerts';
      case 'warning':
        return 'Warning Alerts';
      case 'tidal':
        return 'Tidal Predictions';
      default:
        return 'All Alerts';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getTitle()),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _alerts.isEmpty
              ? Center(
                  child: Container(
                    margin: const EdgeInsets.all(20),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Text('No alerts found'),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alerts.length,
                  itemBuilder: (context, index) {
                    return TweenAnimationBuilder<double>(
                      tween: Tween<double>(begin: 0, end: 1),
                      duration: Duration(milliseconds: 220 + (index * 70)),
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
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: AlertCard(alert: _alerts[index], index: index + 1),
                      ),
                    );
                  },
                ),
    );
  }
}
