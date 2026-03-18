import 'package:flutter/material.dart';
import '../auth_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<void> checkAuth() async {
    _user = await _authService.getUser();
    notifyListeners();
  }

  // Load user from storage on app start
  Future<void> loadUser() async {
    _user = await _authService.getUser();
    notifyListeners();
  }

  Future<bool> register({
    required String username,
    required String phoneNumber,
    required String password,
    required String role,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authService.register(
      username: username,
      phoneNumber: phoneNumber,
      password: password,
      role: role,
    );

    _isLoading = false;

    if (result['success']) {
      _user = result['user'];
      notifyListeners();
      return true;
    } else {
      _error = result['error'];
      notifyListeners();
      return false;
    }
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authService.login(
      identifier: identifier,
      password: password,
    );

    _isLoading = false;

    if (result['success']) {
      _user = result['user'];
      notifyListeners();
      return true;
    } else {
      _error = result['error'];
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
