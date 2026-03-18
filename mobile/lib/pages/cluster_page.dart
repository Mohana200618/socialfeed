import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/models/cluster.dart';
import '../services/models/user.dart';

class ClusterPage extends StatefulWidget {
  const ClusterPage({super.key});

  @override
  State<ClusterPage> createState() => _ClusterPageState();
}

class _ClusterPageState extends State<ClusterPage>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  final AuthService _authService = AuthService();
  late TabController _tabController;

  User? _user;
  List<Cluster> _allClusters = [];
  List<Cluster> _myClusters = [];
  Cluster? _selectedCluster;
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _notifications = [];

  bool _loadingClusters = true;
  bool _autoJoining = false;
  String _statusMsg = '';

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _init();
  }

  Future<void> _init() async {
    _user = await _authService.getUser();
    await Future.wait([_loadAll(), if (_user != null) _loadMyClusters()]);
  }

  Future<void> _loadAll() async {
    setState(() => _loadingClusters = true);
    final clusters = await _api.getAllClusters();
    if (mounted)
      setState(() {
        _allClusters = clusters;
        _loadingClusters = false;
      });
  }

  Future<void> _loadMyClusters() async {
    if (_user == null) return;
    final mine = await _api.getMyClusters(_user!.id);
    if (mounted) setState(() => _myClusters = mine);
  }

  bool _isMember(Cluster c) => _myClusters.any((m) => m.id == c.id);

  void _selectCluster(Cluster cluster) {
    setState(() {
      _selectedCluster = cluster;
      _members = [];
      _notifications = [];
    });
    _pollTimer?.cancel();
    _poll();
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _poll());
  }

  Future<void> _poll() async {
    if (_selectedCluster == null) return;
    final results = await Future.wait([
      _api.getClusterMembers(_selectedCluster!.id),
      _api.getClusterNotifications(_selectedCluster!.id),
    ]);
    if (mounted) {
      setState(() {
        _members = results[0];
        _notifications = results[1];
      });
    }
  }

  Future<void> _autoJoin() async {
    if (_user == null) {
      _showSnack('Please log in first.', error: true);
      return;
    }
    setState(() {
      _autoJoining = true;
      _statusMsg = 'Detecting GPS…';
    });

    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      setState(() {
        _autoJoining = false;
        _statusMsg = 'Location permission denied.';
      });
      return;
    }

    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      setState(
        () => _statusMsg =
            'GPS: ${pos.latitude.toStringAsFixed(4)}°N, ${pos.longitude.toStringAsFixed(4)}°E',
      );

      final result = await _api.autoJoinCluster(
        _user!.id,
        pos.latitude,
        pos.longitude,
      );
      if (result != null) {
        final cluster = Cluster.fromJson(
          result['cluster'] as Map<String, dynamic>,
        );
        final created = result['created'] == true;
        _showSnack(
          created
              ? 'Created & joined: ${cluster.name}'
              : 'Joined: ${cluster.name}',
        );
        await Future.wait([_loadAll(), _loadMyClusters()]);
        _selectCluster(cluster);
      } else {
        _showSnack('Auto-join failed. Try again.', error: true);
      }
    } catch (e) {
      _showSnack('GPS error: $e', error: true);
    } finally {
      if (mounted) setState(() => _autoJoining = false);
    }
  }

  Future<void> _manualJoin(Cluster cluster) async {
    if (_user == null) {
      _showSnack('Please log in first.', error: true);
      return;
    }
    try {
      await _api.broadcastToCluster(
        cluster.id,
        'New member joined.',
        'INFO',
        _user!.id,
      );
      // join endpoint
      await _loadMyClusters();
      _showSnack('Joined ${cluster.name}');
      _selectCluster(cluster);
    } catch (e) {
      _showSnack('Join failed.', error: true);
    }
  }

  void _showSnack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? Colors.red[700] : Colors.green[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  // ─── Build ──────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          '👥 Fishermen Clusters',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () async {
              await Future.wait([
                _loadAll(),
                if (_user != null) _loadMyClusters(),
              ]);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildAutoJoinBar(),
          Expanded(
            child: Row(
              children: [
                // Left: Cluster list
                SizedBox(width: 200, child: _buildClusterList()),
                // Right: Detail panel
                Expanded(
                  child: _selectedCluster == null
                      ? _buildEmptyDetail()
                      : _buildDetailPanel(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAutoJoinBar() {
    return Container(
      color: const Color(0xFF1E293B),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ElevatedButton.icon(
            onPressed: _autoJoining ? null : _autoJoin,
            icon: _autoJoining
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.my_location),
            label: Text(
              _autoJoining ? 'Detecting GPS…' : '📡 Auto-Join Nearest Cluster',
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ),
          if (_statusMsg.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                _statusMsg,
                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildClusterList() {
    return Container(
      color: const Color(0xFF1E293B),
      child: _loadingClusters
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF0EA5E9)),
            )
          : ListView(
              children: [
                if (_myClusters.isNotEmpty) ...[
                  _sectionHeader('MY CLUSTERS', const Color(0xFF0EA5E9)),
                  ..._myClusters.map((c) => _clusterTile(c)),
                ],
                _sectionHeader('ALL CLUSTERS', const Color(0xFF94A3B8)),
                if (_allClusters.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'No clusters yet.',
                      style: TextStyle(color: Color(0xFF475569), fontSize: 12),
                    ),
                  ),
                ..._allClusters.map((c) => _clusterTile(c)),
              ],
            ),
    );
  }

  Widget _sectionHeader(String text, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: color,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _clusterTile(Cluster c) {
    final selected = _selectedCluster?.id == c.id;
    final member = _isMember(c);
    return InkWell(
      onTap: () => _selectCluster(c),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF1E3A8A) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? const Color(0xFF3B82F6) : const Color(0xFF334155),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    c.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (member)
                  const Text(
                    '✓',
                    style: TextStyle(
                      color: Color(0xFF34D399),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
              ],
            ),
            if (c.location != null)
              Text(
                c.location!,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            if (!member)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: GestureDetector(
                  onTap: () => _manualJoin(c),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF16A34A),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      '+ Join',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyDetail() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.group_outlined, size: 56, color: Color(0xFF334155)),
          SizedBox(height: 12),
          Text(
            'Select a cluster to view members\nand shared safety alerts.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF475569), fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailPanel() {
    final online = _members.where((m) {
      final seen = DateTime.tryParse(m['last_seen']?.toString() ?? '');
      return seen != null && DateTime.now().difference(seen).inMinutes < 5;
    }).length;

    return Column(
      children: [
        // Header
        Container(
          color: const Color(0xFF1E293B),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Text(
                _selectedCluster!.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${_members.length} members · $online online',
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
              ),
            ],
          ),
        ),
        // Tabs
        Container(
          color: const Color(0xFF1E293B),
          child: TabBar(
            controller: _tabController,
            indicatorColor: const Color(0xFF0EA5E9),
            labelColor: Colors.white,
            unselectedLabelColor: const Color(0xFF64748B),
            labelStyle: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
            tabs: [
              Tab(text: '👤 Members (${_members.length})'),
              Tab(text: '🔔 Alerts (${_notifications.length})'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [_buildMembersTab(), _buildNotificationsTab()],
          ),
        ),
        _buildBroadcastBar(),
      ],
    );
  }

  Widget _buildMembersTab() {
    if (_members.isEmpty) {
      return const Center(
        child: Text(
          'No members yet.',
          style: TextStyle(color: Color(0xFF475569)),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _members.length,
      itemBuilder: (context, i) {
        final m = _members[i];
        final seen = DateTime.tryParse(m['last_seen']?.toString() ?? '');
        final minsAgo = seen != null
            ? DateTime.now().difference(seen).inMinutes
            : 999;
        final online = minsAgo < 5;
        final isMe = m['user_id'] == _user?.id;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isMe ? const Color(0xFF3B82F6) : const Color(0xFF334155),
            ),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: isMe
                    ? const Color(0xFF1E3A8A)
                    : online
                    ? const Color(0xFF166534)
                    : const Color(0xFF1E293B),
                child: Text(
                  (m['username'] ?? 'F')
                      .toString()
                      .substring(0, 1)
                      .toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          m['username'] ?? 'Fisherman',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (isMe)
                          const Text(
                            ' (You)',
                            style: TextStyle(
                              color: Color(0xFF3B82F6),
                              fontSize: 12,
                            ),
                          ),
                      ],
                    ),
                    Text(
                      online ? '🟢 Online' : '⚫ ${minsAgo}m ago',
                      style: TextStyle(
                        fontSize: 12,
                        color: online
                            ? const Color(0xFF34D399)
                            : const Color(0xFF64748B),
                      ),
                    ),
                    if (m['latitude'] != null)
                      Text(
                        '${double.tryParse(m['latitude'].toString())?.toStringAsFixed(3)}°N  ${double.tryParse(m['longitude'].toString())?.toStringAsFixed(3)}°E',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Color(0xFF475569),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNotificationsTab() {
    if (_notifications.isEmpty) {
      return const Center(
        child: Text(
          'No alerts yet. DANGER/WARNING alerts auto-appear here.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Color(0xFF475569)),
        ),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _notifications.length,
      itemBuilder: (context, i) {
        final n = _notifications[i];
        final type = n['type']?.toString() ?? 'INFO';
        final color = type == 'DANGER'
            ? const Color(0xFFDC2626)
            : type == 'WARNING'
            ? const Color(0xFFEA580C)
            : const Color(0xFF0EA5E9);
        final created = DateTime.tryParse(n['created_at']?.toString() ?? '');
        final minsAgo = created != null
            ? DateTime.now().difference(created).inMinutes
            : 0;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(10),
            border: Border(left: BorderSide(color: color, width: 4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      type,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    minsAgo < 1 ? 'just now' : '${minsAgo}m ago',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                n['message']?.toString() ?? '',
                style: const TextStyle(
                  color: Color(0xFFE2E8F0),
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
              if (n['sender_name'] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'From: ${n['sender_name']}',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  final TextEditingController _broadcastCtrl = TextEditingController();

  Widget _buildBroadcastBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      color: const Color(0xFF1E293B),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📢 BROADCAST TO CLUSTER',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: Color(0xFF64748B),
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _broadcastCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Type a message…',
                    hintStyle: const TextStyle(color: Color(0xFF475569)),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                  ),
                  onSubmitted: (_) => _doBroadcast(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _doBroadcast,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Send',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _doBroadcast() async {
    final msg = _broadcastCtrl.text.trim();
    if (msg.isEmpty || _selectedCluster == null) return;
    final ok = await _api.broadcastToCluster(
      _selectedCluster!.id,
      msg,
      'INFO',
      _user?.id,
    );
    if (ok) {
      _broadcastCtrl.clear();
      _showSnack('Message broadcast!');
      _poll();
    } else {
      _showSnack('Broadcast failed.', error: true);
    }
  }
}
