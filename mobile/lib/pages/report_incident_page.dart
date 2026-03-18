import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../models/incident_models.dart';
import '../services/location_service.dart';
import '../services/media_service.dart';
import '../services/api_service.dart';
import 'media_preview_page.dart';

class ReportIncidentPage extends StatefulWidget {
  const ReportIncidentPage({super.key});

  @override
  State<ReportIncidentPage> createState() => _ReportIncidentPageState();
}

class _ReportIncidentPageState extends State<ReportIncidentPage> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _otherCategoryController = TextEditingController();
  final ApiService _apiService = ApiService();

  IncidentCategory selectedCategory = IncidentCategory.other;
  GPSLocation? currentLocation;
  List<MediaAttachment> mediaAttachments = [];
  bool submitting = false;
  bool loadingLocation = false;
  bool isRecording = false;
  bool isRecordingDescription = false;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _otherCategoryController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => loadingLocation = true);
    try {
      final location = await LocationService.getCurrentLocation();
      setState(() {
        currentLocation = location;
        loadingLocation = false;
      });
    } catch (e) {
      setState(() => loadingLocation = false);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to get location: $e')));
      }
    }
  }

  Future<void> _addImage(ImageSource source) async {
    try {
      final attachment = await MediaService.pickImage(
        source: source,
        location: currentLocation,
      );
      if (attachment != null) {
        setState(() => mediaAttachments.add(attachment));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to add image: $e')));
      }
    }
  }

  void _showGeoTagGuidance(String mediaLabel) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Kindly upload geotag $mediaLabel. Camera capture is recommended for verified location.',
        ),
        backgroundColor: const Color(0xFF0E3A5B),
      ),
    );
  }

  Future<void> _handleGalleryImageUpload() async {
    _showGeoTagGuidance('photo');
    await _addImage(ImageSource.gallery);
  }

  Future<void> _handleGalleryVideoUpload() async {
    _showGeoTagGuidance('photo or video');
    await _addVideo();
  }

  Future<void> _addVideo() async {
    if (kIsWeb) {
      try {
        final attachment = await MediaService.pickVideo();
        if (attachment != null) {
          setState(() => mediaAttachments.add(attachment));
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Failed to add video: $e')));
        }
      }
      return;
    }

    final choice = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Video'),
        content: const Text('Choose video source'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, 'camera'),
            child: const Text('Record Video'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, 'gallery'),
            child: const Text('Choose from Gallery'),
          ),
        ],
      ),
    );

    if (choice == null) return;

    try {
      MediaAttachment? attachment;
      if (choice == 'camera') {
        attachment = await MediaService.recordVideo(location: currentLocation);
      } else {
        attachment = await MediaService.pickVideo();
      }
      if (attachment != null) {
        setState(() => mediaAttachments.add(attachment!));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to add video: $e')));
      }
    }
  }

  Future<void> _recordVideo() async {
    try {
      final attachment = await MediaService.recordVideo(
        location: currentLocation,
      );
      if (attachment != null) {
        setState(() => mediaAttachments.add(attachment));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to record video: $e')));
      }
    }
  }

  Future<void> _toggleDescriptionRecording() async {
    if (kIsWeb) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Voice recording not supported on web browsers'),
        ),
      );
      return;
    }

    if (isRecordingDescription) {
      final attachment = await MediaService.stopAudioRecording();
      if (attachment != null) {
        setState(() {
          mediaAttachments.add(attachment);
          isRecordingDescription = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Voice recording saved as attachment'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } else {
      await MediaService.recordAudio();
      setState(() => isRecordingDescription = true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Recording voice note... Tap to stop'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _toggleAudioRecording() async {
    if (kIsWeb) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Audio recording not supported on web')),
      );
      return;
    }

    if (isRecording) {
      final attachment = await MediaService.stopAudioRecording();
      if (attachment != null) {
        setState(() {
          mediaAttachments.add(attachment);
          isRecording = false;
        });
      }
    } else {
      await MediaService.recordAudio();
      setState(() => isRecording = true);
    }
  }

  void _removeMediaAttachment(int index) {
    setState(() => mediaAttachments.removeAt(index));
  }

  void _openAttachmentPreview(MediaAttachment attachment) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => MediaPreviewPage(attachment: attachment),
      ),
    );
  }

  Future<void> submitIncident() async {
    if (!_formKey.currentState!.validate()) return;

    final customOtherCategory = _otherCategoryController.text.trim();
    final incidentType = selectedCategory == IncidentCategory.other
        ? customOtherCategory
        : selectedCategory.displayName;

    if (selectedCategory == IncidentCategory.other && incidentType.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please type a custom category when selecting Other.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    if (currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Location is required. Please enable location services.',
          ),
        ),
      );
      return;
    }

    if (mediaAttachments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Please add at least one photo, video, or audio recording as evidence.',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => submitting = true);

    try {
      final success = await _apiService.createIncidentWithAttachments(
        incidentData: {
          'title': '$incidentType Incident',
          'description': _descriptionController.text,
          'incidentType': incidentType,
          'location': currentLocation!.locationName,
          'latitude': currentLocation!.latitude,
          'longitude': currentLocation!.longitude,
        },
        attachments: mediaAttachments,
      );

      setState(() => submitting = false);

      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Incident reported successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        } else {
          throw Exception('Server returned failure. Please try again.');
        }
      }
    } catch (e) {
      setState(() => submitting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to report incident: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF3F7FB),
      appBar: AppBar(
        title: const Text('Report Incident'),
        backgroundColor: const Color(0xFF0E3A5B),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildCategorySection(),
                const SizedBox(height: 16),
                _buildLocationSection(),
                const SizedBox(height: 16),
                _buildDescriptionSection(),
                const SizedBox(height: 16),
                _buildMediaSection(),
                const SizedBox(height: 24),
                _buildSubmitButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategorySection() {
    return _SectionCard(
      title: 'Incident Category',
      icon: Icons.category_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DropdownButtonFormField<IncidentCategory>(
            initialValue: selectedCategory,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: IncidentCategory.values.map((category) {
              return DropdownMenuItem(
                value: category,
                child: Text(
                  category.displayName,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                selectedCategory = value!;
                if (selectedCategory != IncidentCategory.other) {
                  _otherCategoryController.clear();
                }
              });
            },
            selectedItemBuilder: (BuildContext context) {
              return IncidentCategory.values.map<Widget>((category) {
                return Container(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    category.displayName,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList();
            },
          ),
          if (selectedCategory == IncidentCategory.other) ...[
            const SizedBox(height: 12),
            TextFormField(
              controller: _otherCategoryController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                labelText: 'Specify category',
                hintText: 'e.g. Shark attack risk, Floating debris, etc.',
              ),
              validator: (value) {
                if (selectedCategory != IncidentCategory.other) {
                  return null;
                }
                if (value == null || value.trim().isEmpty) {
                  return 'Please type the incident category';
                }
                return null;
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLocationSection() {
    return _SectionCard(
      title: 'GPS Location',
      icon: Icons.location_on_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: loadingLocation
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : TextButton.icon(
                    onPressed: _getCurrentLocation,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh'),
                  ),
          ),
          const SizedBox(height: 8),
          if (currentLocation != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEAF3FE),
                border: Border.all(color: const Color(0xFFBDD5F5)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Coordinates',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    LocationService.formatCoordinates(
                      currentLocation!.latitude,
                      currentLocation!.longitude,
                    ),
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                  if (currentLocation!.locationName != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Location: ${currentLocation!.locationName}',
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                  ],
                  if (currentLocation!.accuracy != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Accuracy: ±${currentLocation!.accuracy!.round()}m',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E8),
                border: Border.all(color: const Color(0xFFF5D4AB)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.orange),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Location not available. Please enable location services.',
                      style: TextStyle(color: Colors.orange.shade800),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDescriptionSection() {
    return _SectionCard(
      title: 'Incident Description',
      icon: Icons.description_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            controller: _descriptionController,
            decoration: const InputDecoration(
              hintText: 'Provide detailed information about the incident...',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.all(12),
            ),
            maxLines: 4,
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Please provide a description of the incident';
              }
              if (value.trim().length < 10) {
                return 'Description must be at least 10 characters long';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 10,
            runSpacing: 6,
            children: [
              Text(
                'Voice Note',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: Colors.blue.shade800,
                ),
              ),
              OutlinedButton.icon(
                onPressed: _toggleDescriptionRecording,
                icon: Icon(
                  isRecordingDescription ? Icons.stop : Icons.mic,
                  size: 18,
                ),
                label: Text(
                  isRecordingDescription
                      ? 'Stop Recording'
                      : 'Record Voice Note',
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: isRecordingDescription
                      ? Colors.red.shade800
                      : const Color(0xFF0E3A5B),
                  side: BorderSide(
                    color: isRecordingDescription
                        ? Colors.red.shade300
                        : const Color(0xFF9CC4DE),
                  ),
                ),
              ),
            ],
          ),
          if (isRecordingDescription) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.radio_button_checked,
                    color: Colors.red,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Recording voice note...',
                    style: TextStyle(
                      color: Colors.red.shade800,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMediaSection() {
    return _SectionCard(
      title: 'Media Evidence',
      icon: Icons.perm_media_rounded,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFE7F6FE),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFB9E0F7)),
            ),
            child: const Text(
              'Required: upload at least one geotag photo or video for verification.',
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFF0B3C5D),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              if (kIsWeb) ...[
                _buildMediaActionButton(
                  label: 'Take Photo',
                  icon: Icons.camera_alt_rounded,
                  color: const Color(0xFFDDEFFF),
                  foreground: const Color(0xFF104D7A),
                  onTap: () => _addImage(ImageSource.camera),
                ),
                _buildMediaActionButton(
                  label: 'Select Image',
                  icon: Icons.photo_library_rounded,
                  color: const Color(0xFFDCEEFF),
                  foreground: const Color(0xFF0F4973),
                  onTap: _handleGalleryImageUpload,
                ),
                _buildMediaActionButton(
                  label: 'Take Video',
                  icon: Icons.videocam_rounded,
                  color: const Color(0xFFD4E7FB),
                  foreground: const Color(0xFF1B4E80),
                  onTap: _recordVideo,
                ),
                _buildMediaActionButton(
                  label: 'Select Video',
                  icon: Icons.video_library_rounded,
                  color: const Color(0xFFCCE3FA),
                  foreground: const Color(0xFF1B4E80),
                  onTap: _handleGalleryVideoUpload,
                ),
              ] else ...[
                _buildMediaActionButton(
                  label: 'Take Photo',
                  icon: Icons.camera_alt_rounded,
                  color: const Color(0xFFDDEFFF),
                  foreground: const Color(0xFF104D7A),
                  onTap: () => _addImage(ImageSource.camera),
                ),
                _buildMediaActionButton(
                  label: 'Add Photo',
                  icon: Icons.photo_library_rounded,
                  color: const Color(0xFFDCEEFF),
                  foreground: const Color(0xFF0F4973),
                  onTap: _handleGalleryImageUpload,
                ),
                _buildMediaActionButton(
                  label: 'Add Video',
                  icon: Icons.videocam_rounded,
                  color: const Color(0xFFCCE3FA),
                  foreground: const Color(0xFF1B4E80),
                  onTap: _handleGalleryVideoUpload,
                ),
                _buildMediaActionButton(
                  label: isRecording ? 'Stop Audio' : 'Record Audio',
                  icon: isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                  color: isRecording
                      ? const Color(0xFFFFECE8)
                      : const Color(0xFFDCEEFF),
                  foreground: isRecording
                      ? const Color(0xFF9A3412)
                      : const Color(0xFF0F4973),
                  onTap: _toggleAudioRecording,
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          if (mediaAttachments.isNotEmpty)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: List.generate(mediaAttachments.length, (index) {
                final attachment = mediaAttachments[index];
                return Stack(
                  alignment: Alignment.topRight,
                  children: [
                    GestureDetector(
                      onTap: () => _openAttachmentPreview(attachment),
                      child: Container(
                        width: 150,
                        height: 120,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: attachment.type == MediaType.image
                              ? (attachment.localPath != null &&
                                        attachment.localPath!.isNotEmpty
                                    ? (kIsWeb
                                          ? Image.network(
                                              attachment.localPath!,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  _mediaPlaceholder(
                                                    Icons.image,
                                                  ),
                                            )
                                          : Image.file(
                                              File(attachment.localPath!),
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) =>
                                                  _mediaPlaceholder(
                                                    Icons.image,
                                                  ),
                                            ))
                                    : _mediaPlaceholder(Icons.image))
                              : _mediaPlaceholder(
                                  attachment.type == MediaType.video
                                      ? Icons.videocam
                                      : Icons.audiotrack,
                                ),
                        ),
                      ),
                    ),
                    if (attachment.hasGeoTag)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: IgnorePointer(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 4,
                            ),
                            decoration: const BoxDecoration(
                              color: Color(0xB3000000),
                              borderRadius: BorderRadius.only(
                                bottomLeft: Radius.circular(8),
                                bottomRight: Radius.circular(8),
                              ),
                            ),
                            child: Text(
                              _geoTagText(attachment),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                height: 1.2,
                              ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ),
                    GestureDetector(
                      onTap: () => _removeMediaAttachment(index),
                      child: Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.red,
                        ),
                        padding: const EdgeInsets.all(4),
                        child: const Icon(
                          Icons.close,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
        ],
      ),
    );
  }

  Widget _buildMediaActionButton({
    required String label,
    required IconData icon,
    required Color color,
    required Color foreground,
    required Future<void> Function() onTap,
  }) {
    return ElevatedButton.icon(
      onPressed: onTap,
      icon: Icon(icon),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: foreground,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _mediaPlaceholder(IconData icon) {
    return Container(
      color: Colors.grey.shade200,
      child: Center(child: Icon(icon, size: 40, color: Colors.grey.shade700)),
    );
  }

  String _geoTagText(MediaAttachment attachment) {
    final lat = attachment.latitude;
    final lng = attachment.longitude;
    final timestamp = attachment.capturedAt;
    if (lat == null || lng == null || timestamp == null) {
      return 'No geotag';
    }

    final locationText =
        (attachment.locationName == null ||
            attachment.locationName!.trim().isEmpty)
        ? '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}'
        : attachment.locationName!;
    final timeText = timestamp.toLocal().toString().split('.').first;
    return 'Lat: ${lat.toStringAsFixed(5)}\nLng: ${lng.toStringAsFixed(5)}\n$timeText • $locationText';
  }

  Widget _buildSubmitButton() {
    return ElevatedButton.icon(
      onPressed: submitting ? null : submitIncident,
      icon: submitting
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            )
          : const Icon(Icons.send),
      label: Text(submitting ? 'Submitting...' : 'Submit Incident'),
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF0E3A5B),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFD9E3EC)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF0E3A5B), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0E3A5B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
