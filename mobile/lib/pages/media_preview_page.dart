import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../models/incident_models.dart';
import '../services/location_service.dart';

class MediaPreviewPage extends StatefulWidget {
  const MediaPreviewPage({super.key, required this.attachment});

  final MediaAttachment attachment;

  @override
  State<MediaPreviewPage> createState() => _MediaPreviewPageState();
}

class _MediaPreviewPageState extends State<MediaPreviewPage> {
  // â”€â”€ Video â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  VideoPlayerController? _videoController;
  bool _videoReady = false;
  String? _videoError;

  // â”€â”€ Audio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  final AudioPlayer _audioPlayer = AudioPlayer();
  PlayerState _audioState = PlayerState.stopped;
  Duration _audioDuration = Duration.zero;
  Duration _audioPosition = Duration.zero;
  bool _audioLoading = true;
  String? _audioError;

  // â”€â”€ Geotag location name (resolved lazily) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  String? _resolvedLocationName;

  @override
  void initState() {
    super.initState();
    _resolveLocationName();
    if (widget.attachment.type == MediaType.video) {
      _initVideo();
    } else if (widget.attachment.type == MediaType.audio) {
      _initAudio();
    }
  }

  // â”€â”€ Location resolution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  Future<void> _resolveLocationName() async {
    final a = widget.attachment;
    if (a.locationName != null && a.locationName!.trim().isNotEmpty) {
      if (mounted) setState(() => _resolvedLocationName = a.locationName);
      return;
    }
    if (a.latitude == null || a.longitude == null) return;
    // Use Nominatim HTTP fallback via LocationService
    final name =
        await LocationService.getLocationName(a.latitude!, a.longitude!);
    if (mounted && name != null) {
      setState(() => _resolvedLocationName = name);
    }
  }

  // â”€â”€ Video init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  Future<void> _initVideo() async {
    final path = widget.attachment.localPath;
    if (path == null || path.isEmpty) {
      setState(() => _videoError = 'No video file path.');
      return;
    }
    try {
      VideoPlayerController controller;
      if (kIsWeb) {
        controller = VideoPlayerController.networkUrl(Uri.parse(path));
      } else {
        // Android may return a content:// URI from the picker/camera
        final uri = Uri.tryParse(Uri.encodeFull(path));
        if (uri != null && uri.scheme == 'content') {
          controller = VideoPlayerController.contentUri(uri);
        } else {
          controller = VideoPlayerController.file(File(path));
        }
      }
      _videoController = controller;
      await controller.initialize();
      if (mounted) {
        setState(() => _videoReady = true);
        controller.play();
      }
    } catch (e) {
      if (mounted) setState(() => _videoError = 'Failed to load video:\n$e');
    }
  }

  // â”€â”€ Audio init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  Future<void> _initAudio() async {
    final path = widget.attachment.localPath;
    if (path == null || path.isEmpty) {
      setState(() {
        _audioLoading = false;
        _audioError = 'No audio file path.';
      });
      return;
    }

    // Guard: file must exist and be non-empty
    if (!kIsWeb) {
      final file = File(path);
      if (!file.existsSync() || file.lengthSync() == 0) {
        setState(() {
          _audioLoading = false;
          _audioError =
              'Audio file is missing or empty.\nPlease record again.';
        });
        return;
      }
    }

    try {
      _audioPlayer.onPlayerStateChanged.listen((s) {
        if (mounted) setState(() => _audioState = s);
      });
      _audioPlayer.onDurationChanged.listen((d) {
        if (mounted) setState(() => _audioDuration = d);
      });
      _audioPlayer.onPositionChanged.listen((p) {
        if (mounted) setState(() => _audioPosition = p);
      });
      _audioPlayer.onPlayerComplete.listen((_) {
        if (mounted) {
          setState(() {
            _audioState = PlayerState.stopped;
            _audioPosition = Duration.zero;
          });
        }
      });

      await _audioPlayer.setReleaseMode(ReleaseMode.stop);

      final Source source =
          kIsWeb ? UrlSource(path) : DeviceFileSource(path);

      // setSource loads metadata (duration) without auto-playing
      await _audioPlayer.setSource(source);
      if (mounted) setState(() => _audioLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _audioLoading = false;
          _audioError = 'Failed to load audio:\n$e';
        });
      }
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  String _fmt(Duration d) {
    final mm = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final ss = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mm:$ss';
  }

  IconData get _mediaIcon {
    switch (widget.attachment.type) {
      case MediaType.video:
        return Icons.videocam;
      case MediaType.audio:
        return Icons.audiotrack;
      case MediaType.image:
        return Icons.image;
    }
  }

  // â”€â”€ Geotag panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  Widget _buildGeoTagPanel() {
    final a = widget.attachment;
    if (!a.hasGeoTag) return const SizedBox.shrink();

    final timeText = a.capturedAt!.toLocal().toString().split('.').first;
    final String locText;
    if (_resolvedLocationName != null &&
        _resolvedLocationName!.trim().isNotEmpty) {
      locText = _resolvedLocationName!;
    } else if (a.locationName != null && a.locationName!.trim().isNotEmpty) {
      locText = a.locationName!;
    } else {
      locText = 'Fetching location nameâ€¦';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xCC000000),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            children: [
              Icon(Icons.location_on, color: Colors.greenAccent, size: 16),
              SizedBox(width: 6),
              Text(
                'Geotag',
                style: TextStyle(
                  color: Colors.greenAccent,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _geoRow(Icons.place, locText),
          const SizedBox(height: 4),
          _geoRow(
            Icons.my_location,
            'Lat: ${a.latitude!.toStringAsFixed(6)}   '
            'Lng: ${a.longitude!.toStringAsFixed(6)}',
          ),
          const SizedBox(height: 4),
          _geoRow(Icons.access_time, timeText),
        ],
      ),
    );
  }

  Widget _geoRow(IconData icon, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.white70, size: 13),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
                color: Colors.white, fontSize: 12, height: 1.3),
          ),
        ),
      ],
    );
  }

  // â”€â”€ Content builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  Widget _buildImageView() {
    final path = widget.attachment.localPath;
    if (path == null || path.isEmpty) {
      return const Center(
        child: Icon(Icons.broken_image, size: 80, color: Colors.white38),
      );
    }
    return InteractiveViewer(
      minScale: 0.8,
      maxScale: 5,
      child: Center(
        child: kIsWeb
            ? Image.network(path, fit: BoxFit.contain)
            : Image.file(File(path), fit: BoxFit.contain),
      ),
    );
  }

  Widget _buildVideoView() {
    if (_videoError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 64),
              const SizedBox(height: 16),
              Text(
                _videoError!,
                style: const TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    if (!_videoReady || _videoController == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Colors.white),
            SizedBox(height: 16),
            Text('Loading videoâ€¦',
                style: TextStyle(color: Colors.white54, fontSize: 13)),
          ],
        ),
      );
    }

    final ctrl = _videoController!;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AspectRatio(
          aspectRatio: ctrl.value.aspectRatio,
          child: VideoPlayer(ctrl),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: VideoProgressIndicator(
            ctrl,
            allowScrubbing: true,
            colors: const VideoProgressColors(
              playedColor: Colors.blue,
              bufferedColor: Colors.white38,
              backgroundColor: Colors.white12,
            ),
          ),
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: Icon(
                ctrl.value.isPlaying ? Icons.pause : Icons.play_arrow,
                color: Colors.white,
                size: 36,
              ),
              onPressed: () => setState(
                  () => ctrl.value.isPlaying ? ctrl.pause() : ctrl.play()),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAudioView() {
    if (_audioError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 64),
              const SizedBox(height: 16),
              Text(_audioError!,
                  style: const TextStyle(color: Colors.white70),
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }

    final isPlaying = _audioState == PlayerState.playing;
    final progress = _audioDuration.inMilliseconds == 0
        ? 0.0
        : _audioPosition.inMilliseconds / _audioDuration.inMilliseconds;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 32),
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                  shape: BoxShape.circle, color: Colors.blue.shade900),
              child: const Icon(Icons.audiotrack,
                  size: 52, color: Colors.white),
            ),
            const SizedBox(height: 20),
            Text(
              widget.attachment.fileName ?? 'Audio Recording',
              style: const TextStyle(color: Colors.white, fontSize: 16),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 28),
            if (_audioLoading)
              const Column(
                children: [
                  LinearProgressIndicator(color: Colors.blue),
                  SizedBox(height: 10),
                  Text('Loading audioâ€¦',
                      style:
                          TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              )
            else ...[
              Slider(
                value: progress.clamp(0.0, 1.0),
                onChanged: (v) => _audioPlayer.seek(Duration(
                    milliseconds:
                        (v * _audioDuration.inMilliseconds).round())),
                activeColor: Colors.blue,
                inactiveColor: Colors.white24,
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_fmt(_audioPosition),
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12)),
                  Text(_fmt(_audioDuration),
                      style: const TextStyle(
                          color: Colors.white70, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.replay_10,
                        color: Colors.white70, size: 28),
                    onPressed: () {
                      final pos =
                          _audioPosition - const Duration(seconds: 10);
                      _audioPlayer.seek(
                          pos < Duration.zero ? Duration.zero : pos);
                    },
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () =>
                        isPlaying ? _audioPlayer.pause() : _audioPlayer.resume(),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                          shape: BoxShape.circle, color: Colors.blue),
                      child: Icon(
                          isPlaying ? Icons.pause : Icons.play_arrow,
                          color: Colors.white,
                          size: 32),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.forward_10,
                        color: Colors.white70, size: 28),
                    onPressed: () {
                      final pos =
                          _audioPosition + const Duration(seconds: 10);
                      _audioPlayer.seek(
                          pos > _audioDuration ? _audioDuration : pos);
                    },
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // â”€â”€ Build â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @override
  Widget build(BuildContext context) {
    final Widget mainContent;
    switch (widget.attachment.type) {
      case MediaType.image:
        mainContent = _buildImageView();
      case MediaType.video:
        mainContent = _buildVideoView();
      case MediaType.audio:
        mainContent = _buildAudioView();
    }

    final hasGeo = widget.attachment.hasGeoTag;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Row(
          children: [
            Icon(_mediaIcon, size: 20, color: Colors.white70),
            const SizedBox(width: 8),
            Text(
              widget.attachment.type == MediaType.image
                  ? 'Photo'
                  : widget.attachment.type == MediaType.video
                      ? 'Video'
                      : 'Audio',
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
        actions: [
          if (hasGeo)
            IconButton(
              icon:
                  const Icon(Icons.location_on, color: Colors.greenAccent),
              tooltip: 'Geotag info',
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                backgroundColor: Colors.transparent,
                builder: (_) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: _buildGeoTagPanel(),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: hasGeo
            ? Column(
                children: [
                  Expanded(child: mainContent),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: _buildGeoTagPanel(),
                  ),
                ],
              )
            : mainContent,
      ),
    );
  }
}

