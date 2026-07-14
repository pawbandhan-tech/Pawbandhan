import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkSession();
  }

  Future<void> _checkSession() async {
    await Future.delayed(const Duration(seconds: 2));
    final api = ApiService();
    final auth = AuthService(api);
    final session = await auth.getSession();
    if (!mounted) return;

    if (session['token'] != null && session['role'] == 'admin') {
      Navigator.pushReplacementNamed(context, '/admin');
    } else if (session['uid'] != null && session['role'] != null) {
      Navigator.pushReplacementNamed(context, '/dashboard');
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100, height: 100,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)]),
              ),
              child: const Icon(Icons.pets, color: Colors.white, size: 52),
            ),
            const SizedBox(height: 24),
            const Text('PawBandhan', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
            const SizedBox(height: 8),
            const Text('Every Paw Matters', style: TextStyle(fontSize: 14, color: Colors.grey)),
            const SizedBox(height: 32),
            const CircularProgressIndicator(color: Color(0xFF8B5CF6)),
          ],
        ),
      ),
    );
  }
}
