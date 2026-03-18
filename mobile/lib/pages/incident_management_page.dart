import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:video_player/video_player.dart';
import '../config/api_config.dart';
import '../services/api_service.dart';
import '../services/models/incident.dart';

class IncidentManagementPage extends StatefulWidget {
  const IncidentManagementPage({super.key});

  @override
  State<IncidentManagementPage> createState() => _IncidentManagementPageState();
}

class _IncidentManagementPageState extends State<IncidentManagementPage> {
  final ApiService _apiService = ApiService();
  List<Incident> _incidents = [];
  bool _isLoading = true;

  static const List<String> _statusUpdateOptions = [
    'pending',
    'in progress',
    'resolved',
  ];

  String _normalizeStatus(String status) {
    final normalized = status.toLowerCase().trim();
    if (normalized == 'resolved' || normalized == 'closed') {
      return 'resolved';
    }
    if (normalized == 'investigating' ||
        normalized == 'in_progress' ||
        normalized == 'in-progress' ||
        normalized == 'in progress') {
      return 'in progress';
    }
    return 'pending';
  }

  @override
  void initState() {
    super.initState();
    _loadIncidents();
  }

  Future<void> _loadIncidents() async {
    setState(() => _isLoading = true);
    final incidents = await _apiService.getAllIncidents();
    setState(() {
      _incidents = incidents;
      _isLoading = false;
    });
  }

  Future<void> _updateStatus(int id, String status) async {
    final requestStatus = status == 'in progress' ? 'investigating' : status;
    final success = await _apiService.updateIncidentStatus(id, requestStatus);
    if (success) {
      _loadIncidents();
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Status updated')));
      }
    }
  }

  String _statusBucket(String status) {
    final normalized = _normalizeStatus(status);
    if (normalized == 'resolved') {
      return 'resolved';
    }
    if (normalized == 'in progress') {
      return 'in_progress';
    }
    return 'pending';
  }

  String _bucketLabel(String bucket) {
    switch (bucket) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return bucket;
    }
  }

  Color _bucketColor(String bucket) {
    switch (bucket) {
      case 'pending':
        return const Color(0xFFB45309);
      case 'in_progress':
        return const Color(0xFF1D4ED8);
      case 'resolved':
        return const Color(0xFF047857);
      default:
        return Colors.grey;
    }
  }

  List<Incident> _incidentsForBucket(String bucket) {
    final list = _incidents
        .where((incident) => _statusBucket(incident.status) == bucket)
        .toList();
    list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return list;
  }

  Color _getStatusColor(String status) {
    switch (_normalizeStatus(status)) {
      case 'pending':
        return const Color(0xFFB45309);
      case 'in progress':
        return const Color(0xFF1D4ED8);
      case 'resolved':
        return const Color(0xFF047857);
      default:
        return Colors.grey;
    }
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }

  Widget _buildSummaryCard(String bucket) {
    final items = _incidentsForBucket(bucket);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFD7E4F3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _bucketLabel(bucket),
              style: TextStyle(
                color: _bucketColor(bucket),
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${items.length}',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: Color(0xFF102A43),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIncidentCard(Incident incident) {
    final statusColor = _getStatusColor(incident.status);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFD7E4F3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      incident.title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF102A43),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Reported by ${incident.reporterName ?? 'Unknown'}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF627D98),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _normalizeStatus(incident.status).toUpperCase(),
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (incident.description != null && incident.description!.isNotEmpty)
            Text(
              incident.description!,
              style: const TextStyle(fontSize: 13, color: Color(0xFF334E68)),
            ),
          if (incident.description != null && incident.description!.isNotEmpty)
            const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            children: [
              _infoChip(
                Icons.place_rounded,
                incident.location ?? 'No location',
              ),
              _infoChip(
                Icons.schedule_rounded,
                _formatDateTime(incident.createdAt),
              ),
              if (incident.incidentType != null &&
                  incident.incidentType!.isNotEmpty)
                _infoChip(Icons.flag_rounded, incident.incidentType!),
            ],
          ),
          if (incident.mediaAttachments.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _openIncidentEvidence(incident),
                icon: const Icon(Icons.attach_file_rounded),
                label: Text(
                  'View Evidence (${incident.mediaAttachments.length})',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF0E3A5B),
                  side: const BorderSide(color: Color(0xFFB3CCE6)),
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _statusUpdateOptions.map((status) {
              final selected = _normalizeStatus(incident.status) == status;
              return ChoiceChip(
                label: Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 11,
                    color: selected ? Colors.white : _getStatusColor(status),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                selected: selected,
                selectedColor: _getStatusColor(status),
                backgroundColor: _getStatusColor(
                  status,
                ).withValues(alpha: 0.12),
                side: BorderSide(
                  color: _getStatusColor(status).withValues(alpha: 0.35),
                ),
                onSelected: (_) => _updateStatus(incident.id, status),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  void _openIncidentEvidence(Incident incident) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFFF7FBFF),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.72,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    incident.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF102A43),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Evidence files',
                    style: TextStyle(
                      color: Colors.blueGrey.shade600,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView.separated(
                      itemCount: incident.mediaAttachments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final attachment = incident.mediaAttachments[index];
                        return ListTile(
                          tileColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Color(0xFFD7E4F3)),
                          ),
                          leading: CircleAvatar(
                            backgroundColor: const Color(0xFFE6F0FB),
                            child: Icon(
                              attachment.isImage
                                  ? Icons.image_rounded
                                  : attachment.isVideo
                                  ? Icons.videocam_rounded
                                  : attachment.isAudio
                                  ? Icons.audiotrack_rounded
                                  : Icons.attach_file_rounded,
                              color: const Color(0xFF1D4E89),
                            ),
                          ),
                          title: Text(
                            attachment.fileName ?? 'Attachment ${index + 1}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                attachment.isImage
                                    ? 'IMAGE'
                                    : attachment.isVideo
                                    ? 'VIDEO'
                                    : attachment.isAudio
                                    ? 'AUDIO'
                                    : attachment.type.toUpperCase(),
                                style: const TextStyle(fontSize: 11),
                              ),
                              if (attachment.hasGeoTag) ...[
                                const SizedBox(width: 6),
                                const Icon(
                                  Icons.location_on_rounded,
                                  size: 13,
                                  color: Color(0xFF047857),
                                ),
                                const SizedBox(width: 2),
                                const Text(
                                  'Geotagged',
                                  style: TextStyle(fontSize: 10, color: Color(0xFF047857)),
                                ),
                              ],
                            ],
                          ),
                          trailing: const Icon(Icons.play_circle_fill_rounded),
                          onTap: () => _openAttachmentPlayer(attachment),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _openAttachmentPlayer(IncidentMediaAttachment attachment) {
    showDialog<void>(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF0B1B2B),
        insetPadding: const EdgeInsets.all(14),
        child: _AttachmentPlayerView(
          attachment: attachment,
          geoTagInfo: (attachment.hasGeoTag ||
              attachment.capturedAt != null ||
              attachment.uploadedAt != null ||
              (attachment.locationName?.isNotEmpty ?? false))
              ? {
              'timestamp': (attachment.capturedAt ?? attachment.uploadedAt)
                ?.toLocal(),
                  'latitude': attachment.latitude,
                  'longitude': attachment.longitude,
                  'locationName': attachment.locationName,
                }
              : null,
        ),
      ),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F6FD),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF486581)),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF486581),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBucketList(String bucket) {
    final items = _incidentsForBucket(bucket);
    if (items.isEmpty) {
      return Center(
        child: Text(
          'No ${_bucketLabel(bucket).toLowerCase()} incidents',
          style: const TextStyle(color: Color(0xFF627D98)),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.only(top: 12, bottom: 16),
      itemBuilder: (context, index) => _buildIncidentCard(items[index]),
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemCount: items.length,
    );
  }

  @override
  Widget build(BuildContext context) {
    const buckets = ['pending', 'in_progress', 'resolved'];

    return Scaffold(
      backgroundColor: const Color(0xFFF4F8FC),
      appBar: AppBar(
        title: const Text('Incident Management'),
        backgroundColor: const Color(0xFF0E3A5B),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _incidents.isEmpty
          ? const Center(child: Text('No incidents found'))
          : Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: Column(
                children: [
                  Row(children: buckets.map(_buildSummaryCard).toList()),
                  const SizedBox(height: 12),
                  Expanded(
                    child: DefaultTabController(
                      length: buckets.length,
                      child: Column(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: const Color(0xFFD7E4F3),
                              ),
                            ),
                            child: TabBar(
                              labelColor: const Color(0xFF0E3A5B),
                              unselectedLabelColor: const Color(0xFF627D98),
                              indicatorColor: const Color(0xFF1D4ED8),
                              tabs: const [
                                Tab(text: 'Pending'),
                                Tab(text: 'In Progress'),
                                Tab(text: 'Resolved'),
                              ],
                            ),
                          ),
                          Expanded(
                            child: TabBarView(
                              children: buckets
                                  .map((bucket) => _buildBucketList(bucket))
                                  .toList(),
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

class _AttachmentPlayerView extends StatefulWidget {
  const _AttachmentPlayerView({
    required this.attachment,
    this.geoTagInfo,
  });

  final IncidentMediaAttachment attachment;
  final Map<String, dynamic>? geoTagInfo;

  @override
  State<_AttachmentPlayerView> createState() => _AttachmentPlayerViewState();
}

class _AttachmentPlayerViewState extends State<_AttachmentPlayerView> {
  VideoPlayerController? _videoController;
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _audioPlaying = false;
  String? _videoError;

  Uri _resolvedMediaUri() {
    final rawUrl = _resolvedMediaUrl();
    return Uri.parse(Uri.encodeFull(rawUrl));
  }

  String _resolvedMediaUrl() {
    final rawUrl = widget.attachment.url.trim();
    final mediaBaseUrl = ApiConfig.baseUrl.replaceFirst('/api', '');
    if (rawUrl.isEmpty) {
      return rawUrl;
    }
    if (rawUrl.startsWith('http://localhost') ||
        rawUrl.startsWith('https://localhost') ||
        rawUrl.startsWith('http://127.0.0.1') ||
        rawUrl.startsWith('https://127.0.0.1')) {
      final parsed = Uri.parse(rawUrl);
      return '$mediaBaseUrl${parsed.path}${parsed.hasQuery ? '?${parsed.query}' : ''}';
    }
    if (rawUrl.startsWith('/')) {
      return '$mediaBaseUrl$rawUrl';
    }
    return rawUrl;
  }

  @override
  void initState() {
    super.initState();
    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() => _audioPlaying = false);
      }
    });

    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      final playing = state == PlayerState.playing;
      if (_audioPlaying != playing) {
        setState(() => _audioPlaying = playing);
      }
    });

    if (widget.attachment.isVideo) {
      _initVideo();
    } else if (widget.attachment.isAudio) {
      _initAudio();
    }
  }

  Future<void> _initVideo() async {
    try {
      final url = _resolvedMediaUrl();
      print('[Video] Initializing video from: $url');
      final controller = VideoPlayerController.networkUrl(
        _resolvedMediaUri(),
      );
      await controller.initialize().timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          print('[Video] Load timeout after 30s');
          setState(() => _videoError = 'Video took too long to load');
          throw Exception('Video initialization timeout');
        },
      );
      await controller.setLooping(false);
      print('[Video] Initialized successfully');
      if (mounted) {
        setState(() => _videoController = controller);
      }
    } catch (e) {
      print('[Video] Error: $e');
      if (mounted) {
        setState(() => _videoError = 'Unable to load video');
      }
    }
  }

  Future<void> _initAudio() async {
    try {
      final url = _resolvedMediaUrl();
      print('[Audio] Initializing audio from: $url');
      await _audioPlayer.setReleaseMode(ReleaseMode.stop);
      await _audioPlayer.setVolume(1.0);
      await _audioPlayer.setSourceUrl(url);
      print('[Audio] Initialized successfully');
    } catch (e) {
      print('[Audio] Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Unable to load audio file')),
        );
      }
    }
  }

  Future<void> _toggleAudio() async {
    try {
      if (_audioPlaying) {
        await _audioPlayer.pause();
        setState(() => _audioPlaying = false);
        print('[Audio] Paused');
      } else {
        final url = _resolvedMediaUrl();
        print('[Audio] Playing from: $url');
        await _audioPlayer.stop();
        await _audioPlayer.play(UrlSource(url));
        if (mounted) {
          setState(() => _audioPlaying = true);
        }
        print('[Audio] Started playing');
      }
    } catch (e) {
      print('[Audio] Play error: $e');
      if (mounted) {
        setState(() => _audioPlaying = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Failed to play audio')),
        );
      }
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  String _formatGeoTag() {
    if (widget.geoTagInfo == null) return '';
    final parts = <String>[];
    if (widget.geoTagInfo!['timestamp'] is DateTime) {
      final dt = widget.geoTagInfo!['timestamp'] as DateTime;
      parts.add('${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}');
    }
    if (widget.geoTagInfo!['latitude'] != null &&
        widget.geoTagInfo!['longitude'] != null) {
      final lat = (widget.geoTagInfo!['latitude'] as num).toStringAsFixed(5);
      final lng = (widget.geoTagInfo!['longitude'] as num).toStringAsFixed(5);
      parts.add('$lat, $lng');
    }
    if (widget.geoTagInfo!['locationName'] != null &&
        widget.geoTagInfo!['locationName'].toString().isNotEmpty) {
      parts.add(widget.geoTagInfo!['locationName'].toString());
    }
    return parts.join(' • ');
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 420,
      child: Column(
        children: [
          Align(
            alignment: Alignment.topRight,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          Expanded(
            child: Center(
              child: widget.attachment.isImage
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Expanded(
                          child: InteractiveViewer(
                            child: Image.network(
                              _resolvedMediaUrl(),
                              errorBuilder: (_, __, ___) => const Text(
                                'Image failed to load',
                                style: TextStyle(color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                        if (widget.geoTagInfo != null) ...[const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black26,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _formatGeoTag(),
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                        ],
                      ],
                    )
                  : widget.attachment.isVideo
                  ? (_videoError != null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.error_outline_rounded,
                                  size: 48,
                                  color: Colors.red,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  _videoError!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: 12),
                                OutlinedButton(
                                  onPressed: () {
                                    setState(() => _videoError = null);
                                    _initVideo();
                                  },
                                  child: const Text(
                                    'Retry',
                                    style: TextStyle(color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                          )
                        : _videoController == null
                        ? Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const CircularProgressIndicator(
                                color: Colors.white,
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'Loading video...',
                                style: TextStyle(color: Colors.white70),
                              ),
                            ],
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              AspectRatio(
                                aspectRatio:
                                    _videoController!.value.aspectRatio,
                                child: VideoPlayer(_videoController!),
                              ),
                              IconButton(
                                icon: Icon(
                                  _videoController!.value.isPlaying
                                      ? Icons.pause_circle_filled
                                      : Icons.play_circle_fill,
                                  size: 42,
                                  color: Colors.white,
                                ),
                                onPressed: () {
                                  setState(() {
                                    if (_videoController!.value.isPlaying) {
                                      _videoController!.pause();
                                    } else {
                                      _videoController!.play();
                                    }
                                  });
                                },
                              ),
                              if (widget.geoTagInfo != null) ...[
                                const SizedBox(height: 12),
                                Text(
                                  _formatGeoTag(),
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ],
                          ))
                  : widget.attachment.isAudio
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.audiotrack_rounded,
                          size: 68,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: _toggleAudio,
                          icon: Icon(
                            _audioPlaying ? Icons.pause : Icons.play_arrow,
                          ),
                          label: Text(
                            _audioPlaying ? 'Pause Audio' : 'Play Audio',
                          ),
                        ),
                        if (widget.geoTagInfo != null) ...[const SizedBox(height: 12),
                          Text(
                            _formatGeoTag(),
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ],
                    )
                  : const Text(
                      'Unsupported file type',
                      style: TextStyle(color: Colors.white),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
