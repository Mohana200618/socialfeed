import 'package:flutter/material.dart';

class AnimatedPressable extends StatefulWidget {
  const AnimatedPressable({
    super.key,
    required this.child,
    this.onTap,
  });

  final Widget child;
  final VoidCallback? onTap;

  @override
  State<AnimatedPressable> createState() => _AnimatedPressableState();
}

class _AnimatedPressableState extends State<AnimatedPressable> {
  double _scale = 1;

  void _setScale(double value) {
    if (!mounted) return;
    setState(() => _scale = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _setScale(0.98),
      onTapCancel: () => _setScale(1),
      onTapUp: (_) => _setScale(1),
      onTap: widget.onTap,
      child: AnimatedScale(
        duration: const Duration(milliseconds: 140),
        curve: Curves.easeOut,
        scale: _scale,
        child: widget.child,
      ),
    );
  }
}
