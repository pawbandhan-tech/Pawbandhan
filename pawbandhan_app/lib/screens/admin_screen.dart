import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../config/api_config.dart';
import '../models/case_model.dart';
import '../widgets/case_card.dart';
import '../widgets/support_widget.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});
  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final _api = ApiService();
  late final AuthService _auth;
  int _activeTab = 0;
  List<CaseModel> _cases = [];
  List<dynamic> _accounts = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _auth = AuthService(_api);
    _loadSession();
  }

  Future<void> _loadSession() async {
    final session = await _auth.getSession();
    if (session['token'] != null) {
      _api.setAuth(session['token']!);
      _loadData();
    }
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        _api.get(ApiConfig.adminStats),
        _api.get(ApiConfig.adminCases),
        _api.get(ApiConfig.adminAccounts),
      ]);
      setState(() {
        _stats = results[0] is Map ? Map<String, dynamic>.from(results[0]) : {};
        _cases = (results[1] is List ? results[1] as List : []).map<CaseModel>((e) => CaseModel.fromJson(e is Map<String, dynamic> ? e : {})).toList();
        _accounts = results[2] is List ? results[2] : [];
        _loading = false;
      });
    } catch (e) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Panel', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [IconButton(icon: const Icon(Icons.logout), onPressed: () async { await _auth.logout(); if (!context.mounted) return; Navigator.pushReplacementNamed(context, '/login'); })],
      ),
      body: _loading ? const Center(child: CircularProgressIndicator()) : IndexedStack(
        index: _activeTab,
        children: [
          RefreshIndicator(onRefresh: _loadData, child: ListView(padding: const EdgeInsets.all(16), children: [
            // Stats row
            Row(children: [
              _StatCard(Icons.favorite, _stats['rescues']?.toString() ?? '0', 'Rescues', const Color(0xFF8B5CF6)),
              _StatCard(Icons.business, _stats['ngos']?.toString() ?? '0', 'NGOs', const Color(0xFF3B82F6)),
              _StatCard(Icons.medical_services, _stats['doctors']?.toString() ?? '0', 'Doctors', const Color(0xFF06B6D4)),
              _StatCard(Icons.motorcycle, _stats['riders']?.toString() ?? '0', 'Riders', const Color(0xFFF97316)),
            ].expand((w) => [w, const SizedBox(width: 8)]).toList()),
            const SizedBox(height: 20),
            Text('Recent Cases', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ..._cases.take(10).map((c) => CaseCard(c)),
          ])),
          ListView(padding: const EdgeInsets.all(16), children: _accounts.map((a) => Card(child: ListTile(title: Text(a['_label']?.toString() ?? 'Unknown'), subtitle: Text('${a['_type']} • ${a['status']}', style: const TextStyle(fontSize: 12)), trailing: Chip(label: Text(a['_type']?.toString() ?? '', style: const TextStyle(fontSize: 11)))))).toList()),
          SupportWidget(uid: '', role: 'admin', name: 'Admin', isAdmin: true),
        ],
      ),
      bottomNavigationBar: NavigationBar(selectedIndex: _activeTab, onDestinationSelected: (i) => setState(() => _activeTab = i), destinations: const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
        NavigationDestination(icon: Icon(Icons.people_outlined), selectedIcon: Icon(Icons.people), label: 'Accounts'),
        NavigationDestination(icon: Icon(Icons.support_agent_outlined), selectedIcon: Icon(Icons.support_agent), label: 'Support'),
      ]),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  const _StatCard(this.icon, this.value, this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Card(child: Padding(padding: const EdgeInsets.all(14), child: Column(children: [
      Icon(icon, color: color, size: 22), const SizedBox(height: 6),
      Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
      Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
    ]))));
  }
}
