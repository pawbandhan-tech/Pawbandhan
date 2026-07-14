import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _isLogin = true;
  bool _loading = false;
  String? _error;
  String _role = 'customer';
  final _api = ApiService();
  late final AuthService _auth;

  final _roles = [
    {'key': 'customer', 'icon': Icons.pets, 'label': 'Customer', 'color': Color(0xFF8B5CF6)},
    {'key': 'doctor', 'icon': Icons.medical_services, 'label': 'Veterinarian', 'color': Color(0xFF06B6D4)},
    {'key': 'ngo', 'icon': Icons.business, 'label': 'NGO Partner', 'color': Color(0xFF3B82F6)},
    {'key': 'representative', 'icon': Icons.motorcycle, 'label': 'Field Rescuer', 'color': Color(0xFFF97316)},
    {'key': 'admin', 'icon': Icons.admin_panel_settings, 'label': 'Admin', 'color': Color(0xFF6B21A8)},
  ];

  @override
  void initState() { super.initState(); _auth = AuthService(_api); }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      if (_role == 'admin') {
        await _auth.loginAdmin(_emailCtrl.text.trim(), _passCtrl.text);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/admin');
      } else if (_role == 'customer' && _isLogin) {
        await _auth.loginCustomer(_emailCtrl.text.trim(), _passCtrl.text);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/dashboard');
      } else {
        await _auth.loginPartner(_emailCtrl.text.trim(), _passCtrl.text, _role);
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    }
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final roleData = _roles.firstWhere((r) => r['key'] == _role);
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 32),
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), gradient: LinearGradient(colors: [(roleData['color'] as Color), (roleData['color'] as Color).withOpacity(0.6)])),
                child: Icon(roleData['icon'] as IconData, color: Colors.white, size: 34),
              ),
              const SizedBox(height: 16),
              Text('PawBandhan', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 32),
              // Role selector
              Wrap(spacing: 8, children: _roles.map((r) => ChoiceChip(
                label: Text(r['label'] as String, style: TextStyle(fontSize: 12)),
                selected: _role == r['key'],
                selectedColor: (r['color'] as Color).withOpacity(0.15),
                onSelected: (_) => setState(() => _role = r['key'] as String),
                avatar: Icon(r['icon'] as IconData, size: 18, color: _role == r['key'] ? r['color'] as Color : Colors.grey),
              )).toList()),
              const SizedBox(height: 24),
              if (_role == 'admin')
                Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary), const SizedBox(width: 12), const Expanded(child: Text('Use admin credentials to access the admin panel', style: TextStyle(fontSize: 13)))]))),
              if (_error != null)
                Card(child: Padding(padding: const EdgeInsets.all(12), child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))))),
              const SizedBox(height: 12),
              if (!_isLogin && _role != 'admin') ...[
                TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person), border: OutlineInputBorder())),
                const SizedBox(height: 14),
                TextField(controller: _phoneCtrl, decoration: const InputDecoration(labelText: 'Phone', prefixIcon: Icon(Icons.phone), border: OutlineInputBorder()), keyboardType: TextInputType.phone),
                const SizedBox(height: 14),
              ],
              TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email), border: OutlineInputBorder()), keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 14),
              TextField(controller: _passCtrl, decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock), border: OutlineInputBorder()), obscureText: true),
              const SizedBox(height: 24),
              SizedBox(width: double.infinity, height: 50, child: FilledButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(_isLogin ? 'Sign In' : 'Create Account'))),
              const SizedBox(height: 12),
              TextButton(onPressed: () => setState(() => _isLogin = !_isLogin), child: Text(_isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In')),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() { _emailCtrl.dispose(); _passCtrl.dispose(); _nameCtrl.dispose(); _phoneCtrl.dispose(); super.dispose(); }
}
