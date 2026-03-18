import 'package:flutter/material.dart';

class MobileAppTheme {
  MobileAppTheme._();

  static const Color primary = Color(0xFF1E3A8A);
  static const Color secondary = Color(0xFF06B6D4);
  static const Color background = Color(0xFFF8FAFC);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF475569);

  static const LinearGradient surfaceGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0xFF1E3A8A),
      Color(0xFF1D4ED8),
      Color(0xFF06B6D4),
    ],
  );

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: secondary,
      surface: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w700,
          color: textPrimary,
          letterSpacing: -0.3,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: textPrimary,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: textSecondary,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: textSecondary,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shadowColor: Colors.transparent,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: secondary, width: 1.4),
        ),
        floatingLabelStyle: const TextStyle(
          color: primary,
          fontWeight: FontWeight.w600,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: primary,
          minimumSize: const Size.fromHeight(52),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFFE11D48),
        foregroundColor: Colors.white,
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
