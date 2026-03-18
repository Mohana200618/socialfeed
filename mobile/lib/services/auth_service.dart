import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'models/user.dart';

class AuthService {
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  Future<void> saveUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user', jsonEncode(user.toJson()));
  }

  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }

  Future<void> clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('user');
  }

  Future<Map<String, dynamic>> register({
    required String username,
    required String phoneNumber,
    required String password,
    required String role,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.register),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'phoneNumber': phoneNumber,
          'password': password,
          'role': role,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201 && data['success']) {
        final user = User.fromJson(data['data']['user']);
        final token = data['data']['token'];
        
        await saveToken(token);
        await saveUser(user);

        return {'success': true, 'user': user};
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Registration failed'
        };
      }
    } on SocketException {
      return {
        'success': false,
        'error': 'Cannot reach backend server. Check phone and PC are on same Wi-Fi and use reachable IP in ApiConfig.'
      };
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  Future<Map<String, dynamic>> login({
    required String identifier,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(ApiConfig.login),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success']) {
        final user = User.fromJson(data['data']['user']);
        final token = data['data']['token'];
        
        await saveToken(token);
        await saveUser(user);

        return {'success': true, 'user': user};
      } else {
        return {
          'success': false,
          'error': data['error'] ?? 'Login failed'
        };
      }
    } on SocketException {
      return {
        'success': false,
        'error': 'Cannot reach backend server. Check phone and PC are on same Wi-Fi and use reachable IP in ApiConfig.'
      };
    } catch (e) {
      return {'success': false, 'error': 'Network error: $e'};
    }
  }

  Future<void> logout() async {
    await clearAuth();
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null;
  }
}
