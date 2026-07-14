import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  String? _token;
  String? _uid;
  String? _role;

  void setAuth(String token, {String? uid, String? role}) {
    _token = token;
    _uid = uid;
    _role = role;
  }

  void clearAuth() {
    _token = null;
    _uid = null;
    _role = null;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<dynamic> get(String url, {Map<String, String>? params}) async {
    final uri = params != null ? Uri.parse(url).replace(queryParameters: params) : Uri.parse(url);
    final res = await http.get(uri, headers: _headers);
    return _handleResponse(res);
  }

  Future<dynamic> post(String url, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse(url), headers: _headers, body: jsonEncode(body));
    return _handleResponse(res);
  }

  Future<dynamic> put(String url, Map<String, dynamic> body) async {
    final res = await http.put(Uri.parse(url), headers: _headers, body: jsonEncode(body));
    return _handleResponse(res);
  }

  dynamic _handleResponse(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try { return jsonDecode(res.body); } catch (_) { return res.body; }
    }
    try {
      final body = jsonDecode(res.body);
      throw ApiException(body['error'] ?? 'Request failed', res.statusCode);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error', res.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}
