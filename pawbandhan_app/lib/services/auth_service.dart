import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class AuthService {
  final ApiService api;
  AuthService(this.api);

  Future<Map<String, dynamic>> loginCustomer(String email, String password) async {
    final data = await api.post(ApiConfig.loginCustomer, {'email': email, 'password': password, 'action': 'login'});
    await _saveSession(data, 'customer');
    return data;
  }

  Future<Map<String, dynamic>> loginPartner(String email, String password, String role) async {
    final data = await api.post(ApiConfig.loginPartner, {'email': email, 'password': password, 'role': role, 'action': 'login'});
    await _saveSession(data, role);
    return data;
  }

  Future<Map<String, dynamic>> loginAdmin(String email, String password) async {
    final data = await api.post(ApiConfig.adminLogin, {'email': email, 'password': password});
    api.setAuth(data['token'] ?? '', uid: data['admin']?['email'], role: 'admin');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pb_token', data['token'] ?? '');
    await prefs.setString('pb_role', 'admin');
    await prefs.setString('pb_email', email);
    return data;
  }

  Future<void> _saveSession(Map<String, dynamic> data, String role) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pb_uid', data['uid']?.toString() ?? '');
    await prefs.setString('pb_role', role);
    await prefs.setString('pb_name', data['name']?.toString() ?? '');
  }

  Future<Map<String, String?>> getSession() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'uid': prefs.getString('pb_uid'),
      'role': prefs.getString('pb_role'),
      'name': prefs.getString('pb_name'),
      'token': prefs.getString('pb_token'),
    };
  }

  Future<void> logout() async {
    api.clearAuth();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
