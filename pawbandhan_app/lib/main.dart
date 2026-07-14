import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/admin_screen.dart';

void main() => runApp(const PawBandhanApp());

class PawBandhanApp extends StatelessWidget {
  const PawBandhanApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PawBandhan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5CF6)),
        fontFamily: 'Outfit',
        useMaterial3: true,
      ),
      initialRoute: '/splash',
      routes: {
        '/splash': (_) => const SplashScreen(),
        '/login': (_) => const LoginScreen(),
        '/dashboard': (_) => const DashboardScreen(),
        '/admin': (_) => const AdminScreen(),
      },
    );
  }
}
