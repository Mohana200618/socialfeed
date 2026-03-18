import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:image/image.dart' as img;
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/incident_models.dart';

class MediaService {
  static final ImagePicker _picker = ImagePicker();
  static final AudioRecorder _audioRecorder = AudioRecorder();

  static MediaAttachment _withOptionalGeoTag({
    required MediaType type,
    required XFile file,
    GPSLocation? location,
    String? overridePath,
    DateTime? capturedAt,
  }) {
    return MediaAttachment(
      type: type,
      localPath: overridePath ?? file.path,
      fileName: file.name,
      capturedAt: location == null ? null : (capturedAt ?? DateTime.now()),
      latitude: location?.latitude,
      longitude: location?.longitude,
      locationName: location?.locationName,
    );
  }

  static String _formatTime(DateTime dateTime) {
    final local = dateTime.toLocal();
    final mm = local.month.toString().padLeft(2, '0');
    final dd = local.day.toString().padLeft(2, '0');
    final hh = local.hour.toString().padLeft(2, '0');
    final min = local.minute.toString().padLeft(2, '0');
    final ss = local.second.toString().padLeft(2, '0');
    return '${local.year}-$mm-$dd $hh:$min:$ss';
  }

  static Future<String> _stampGeoTagOnImage({
    required XFile sourceFile,
    required GPSLocation location,
    required DateTime capturedAt,
  }) async {
    if (kIsWeb) {
      return sourceFile.path;
    }

    try {
      final bytes = await sourceFile.readAsBytes();
      final decoded = img.decodeImage(bytes);
      if (decoded == null) {
        return sourceFile.path;
      }

      // Apply EXIF orientation before drawing the geotag text.
      final working = img.bakeOrientation(decoded);

      final lines = <String>[
        'Lat: ${location.latitude.toStringAsFixed(5)}',
        'Lng: ${location.longitude.toStringAsFixed(5)}',
        'Time: ${_formatTime(capturedAt)}',
        'Loc: ${location.locationName ?? 'Unknown location'}',
      ];

      const textPadding = 8;
      const lineHeight = 18;
      final overlayHeight = (lines.length * lineHeight) + (textPadding * 2);
      final y1 = working.height - overlayHeight;
      final safeY1 = y1 < 0 ? 0 : y1;

      img.fillRect(
        working,
        x1: 0,
        y1: safeY1,
        x2: working.width - 1,
        y2: working.height - 1,
        color: img.ColorRgba8(0, 0, 0, 170),
      );

      for (var i = 0; i < lines.length; i++) {
        img.drawString(
          working,
          lines[i],
          font: img.arial14,
          x: textPadding,
          y: safeY1 + textPadding + (i * lineHeight),
          color: img.ColorRgb8(255, 255, 255),
        );
      }

      final dir = await getTemporaryDirectory();
      final sourcePath = sourceFile.path.toLowerCase();
      final isPng = sourcePath.endsWith('.png');
      final extension = isPng ? 'png' : 'jpg';
      final outPath =
          '${dir.path}/geotag_${DateTime.now().millisecondsSinceEpoch}.$extension';

      final encoded = isPng
          ? img.encodePng(working)
          : img.encodeJpg(working, quality: 90);
      await File(outPath).writeAsBytes(encoded, flush: true);
      return outPath;
    } catch (_) {
      // Never block image usage if geotag rendering fails on a device codec.
      return sourceFile.path;
    }
  }

  static Future<MediaAttachment?> pickImage({
    required ImageSource source,
    GPSLocation? location,
  }) async {
    final capturedAt = DateTime.now();
    final XFile? file = await _picker.pickImage(
      source: source,
      imageQuality: 80,
    );
    if (file == null) return null;

    final geo = source == ImageSource.camera ? location : null;
    String? stampedPath;
    if (geo != null) {
      stampedPath = await _stampGeoTagOnImage(
        sourceFile: file,
        location: geo,
        capturedAt: capturedAt,
      );
    }

    return _withOptionalGeoTag(
      type: MediaType.image,
      file: file,
      location: geo,
      overridePath: stampedPath,
      capturedAt: capturedAt,
    );
  }

  static Future<MediaAttachment?> pickVideo({GPSLocation? location}) async {
    final XFile? file = await _picker.pickVideo(
      source: ImageSource.gallery,
    );
    if (file == null) return null;
    return _withOptionalGeoTag(
      type: MediaType.video,
      file: file,
      location: null,
    );
  }

  static Future<MediaAttachment?> recordVideo({GPSLocation? location}) async {
    final XFile? file = await _picker.pickVideo(
      source: ImageSource.camera,
    );
    if (file == null) return null;
    return _withOptionalGeoTag(
      type: MediaType.video,
      file: file,
      location: location,
    );
  }

  static Future<void> recordAudio() async {
    // Explicitly request microphone permission on mobile before any recording
    if (!kIsWeb) {
      final status = await Permission.microphone.request();
      if (!status.isGranted) return;
    }
    if (!await _audioRecorder.hasPermission()) return;

    String path;
    if (kIsWeb) {
      path = 'audio_${DateTime.now().millisecondsSinceEpoch}.m4a';
    } else {
      final dir = await getTemporaryDirectory();
      path = '${dir.path}/audio_${DateTime.now().millisecondsSinceEpoch}.m4a';
    }
    await _audioRecorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc),
      path: path,
    );
  }

  static Future<MediaAttachment?> stopAudioRecording() async {
    final path = await _audioRecorder.stop();
    if (path == null) return null;
    return MediaAttachment(
      type: MediaType.audio,
      localPath: path,
      fileName: path.split('/').last,
    );
  }
}
