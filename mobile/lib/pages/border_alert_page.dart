import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:geolocator/geolocator.dart';
import '../services/border_service.dart';

class BorderAlertPage extends StatefulWidget {
  const BorderAlertPage({super.key});

  @override
  State<BorderAlertPage> createState() => _BorderAlertPageState();
}

class _BorderAlertPageState extends State<BorderAlertPage>
    with TickerProviderStateMixin {
  final BorderService _borderService = BorderService();
  final FlutterTts _tts = FlutterTts();

  BorderCheckResult? _result;
  bool _loading = false;
  String? _error;
  Timer? _autoRefreshTimer;
  String? _lastAlertStatus;
  int _notifyCount = 0; // how many times alerted for this alert session (max 3)

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // ── Colour scheme ──────────────────────────────────────────────
  static const _safeColor = Color(0xFF16A34A); // green-600
  static const _warningColor = Color(0xFFEA580C); // orange-600
  static const _dangerColor = Color(0xFFDC2626); // red-600
  static const _unknownColor = Color(0xFF475569); // slate-600

  Color get _statusColor {
    switch (_result?.status) {
      case 'SAFE':
        return _safeColor;
      case 'WARNING':
        return _warningColor;
      case 'DANGER':
        return _dangerColor;
      default:
        return _unknownColor;
    }
  }

  IconData get _statusIcon {
    switch (_result?.status) {
      case 'SAFE':
        return Icons.check_circle_outline;
      case 'WARNING':
        return Icons.warning_amber_rounded;
      case 'DANGER':
        return Icons.dangerous_rounded;
      default:
        return Icons.location_searching;
    }
  }

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initTts();
    _checkNow();

    // Auto-refresh every 30 seconds
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) _checkNow();
    });
  }

  Future<void> _initTts() async {
    await _tts.setLanguage('en-IN');
    await _tts.setSpeechRate(0.48);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
  }

  Future<void> _speak(String text) async {
    await _tts.stop();
    await _tts.speak(text);
  }

  Future<void> _checkNow() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      // 1. Request location permission
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission permanently denied. Enable it in Settings.',
        );
      }

      // 2. Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // 3. Call backend
      final result = await _borderService.checkBorder(
        position.latitude,
        position.longitude,
      );

      if (!mounted) return;
      setState(() {
        _result = result;
        _loading = false;
      });

      // Reset notify count when status changes
      if (result.status != _lastAlertStatus) {
        _notifyCount = 0;
        _lastAlertStatus = result.status;
      }

      // Speak for DANGER/WARNING up to 3 times per alert session
      if ((result.status == 'DANGER' || result.status == 'WARNING') &&
          _notifyCount < 3) {
        _notifyCount++;
        await _speakAlert(result);
      } else if (result.status == 'SAFE' && _lastAlertStatus != 'SAFE') {
        // Speak safe once when returning to safe zone
        await _speakAlert(result);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _speakAlert(BorderCheckResult result) async {
    final km = result.distanceKm.toStringAsFixed(1);
    final dir = result.safeDirection ?? 'West';
    switch (result.status) {
      case 'DANGER':
        await _speak(
          'Danger! Danger! You are only $km kilometres from the international border. '
          'Steer your boat $dir immediately to move away from the border!',
        );
        break;
      case 'WARNING':
        await _speak(
          'Warning. You are $km kilometres from the international border. '
          'Steer your boat $dir to return to safer waters.',
        );
        break;
      case 'SAFE':
        await _speak(
          'You are safe. You are $km kilometres from the border. '
          'You are in a safe fishing zone.',
        );
        break;
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _pulseController.dispose();
    _tts.stop();
    super.dispose();
  }

  // ── UI helpers ──────────────────────────────────────────────────

  Widget _buildStatusBadge() {
    final color = _statusColor;
    final label = _result?.status ?? 'CHECKING';

    return ScaleTransition(
      scale: _result?.status == 'DANGER'
          ? _pulseAnimation
          : const AlwaysStoppedAnimation(1.0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(50),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.45),
              blurRadius: 24,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.w900,
            letterSpacing: 3,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(
            color: const Color(0x110F172A),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading && _result == null) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Checking your position…'),
          ],
        ),
      );
    }

    if (_error != null && _result == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.location_off, size: 56, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red, fontSize: 15),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _checkNow,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final result = _result!;
    final color = _statusColor;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Big status icon
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
            builder: (context, v, child) => Opacity(
              opacity: v,
              child: Transform.scale(scale: v, child: child),
            ),
            child: Icon(_statusIcon, size: 100, color: color),
          ),
          const SizedBox(height: 20),

          // Status badge
          _buildStatusBadge(),
          const SizedBox(height: 8),

          // Alert count badge (shown when DANGER or WARNING)
          if ((result.status == 'DANGER' || result.status == 'WARNING') &&
              _notifyCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '🔔 Alert $_notifyCount of 3',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          const SizedBox(height: 20),

          // Message
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Text(
              result.message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: color,
                fontWeight: FontWeight.w600,
                height: 1.5,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Info cards
          _buildInfoCard(
            icon: Icons.social_distance,
            label: 'DISTANCE FROM BORDER',
            value: '${result.distanceKm.toStringAsFixed(2)} km',
            color: color,
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            icon: Icons.place,
            label: 'NEAREST REFERENCE POINT',
            value: result.nearestBorderPoint,
            color: const Color(0xFF0EA5E9),
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            icon: Icons.my_location,
            label: 'YOUR COORDINATES',
            value:
                'Lat ${result.lat.toStringAsFixed(4)}, Lng ${result.lng.toStringAsFixed(4)}',
            color: const Color(0xFF8B5CF6),
          ),
          // Direction escape card
          if (result.safeDirection != null && result.status != 'SAFE') ...[
            const SizedBox(height: 12),
            _buildInfoCard(
              icon: Icons.navigation_rounded,
              label: 'STEER BOAT TOWARDS',
              value: '${result.safeDirection} → Safe Zone',
              color: color,
            ),
          ],
          // Escape instruction banner
          if (result.escapeInstruction != null && result.status != 'SAFE') ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                border: Border.all(color: color.withOpacity(0.4)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(Icons.directions_boat_rounded, color: color, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      result.escapeInstruction!,
                      style: TextStyle(
                        color: color,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Manual check button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : _checkNow,
              icon: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.refresh),
              label: const Text('Check Now'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Re-speak button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _result == null ? null : () => _speakAlert(_result!),
              icon: const Icon(Icons.volume_up_rounded),
              label: const Text('Repeat Voice Alert'),
              style: OutlinedButton.styleFrom(
                foregroundColor: color,
                side: BorderSide(color: color),
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'Auto-updates every 30 seconds',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              'Last update error: $_error',
              style: const TextStyle(color: Colors.red, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = _statusColor;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: color,
        foregroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Border Alert',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        actions: [
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(right: 16),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Check now',
            onPressed: _loading ? null : _checkNow,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }
}
