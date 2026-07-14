import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../config/api_config.dart';
import '../models/case_model.dart';
import '../widgets/case_card.dart';
import '../widgets/support_widget.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiService();
  late final AuthService _auth;
  String? _uid, _role, _name;
  List<CaseModel> _cases = [];
  bool _loading = true;
  int _activeTab = 0;

  @override
  void initState() {
    super.initState();
    _auth = AuthService(_api);
    _load();
  }

  Future<void> _load() async {
    final session = await _auth.getSession();
    _uid = session['uid'];
    _role = session['role'];
    _name = session['name'];
    await _loadCases();
  }

  Future<void> _loadCases() async {
    try {
      final data = await _api.get(_role == 'doctor' ? '${ApiConfig.doctorData}/${_uid}' : _role == 'ngo' ? '${ApiConfig.ngoData}/${_uid}' : ApiConfig.casesUser.replaceAll('[uid]', _uid ?? ''));
      setState(() {
        _cases = (data is List ? data : data['cases'] ?? []).map<CaseModel>((e) => CaseModel.fromJson(e is Map<String, dynamic> ? e : {})).toList();
        _loading = false;
      });
    } catch (e) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PawBandhan', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [IconButton(icon: const Icon(Icons.logout), onPressed: () async { await _auth.logout(); if (!context.mounted) return; Navigator.pushReplacementNamed(context, '/login'); })],
      ),
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : _activeTab == 0
            ? _cases.isEmpty
                ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.pets, size: 64, color: Colors.grey[300]), const SizedBox(height: 16), const Text('No cases yet', style: TextStyle(color: Colors.grey)), const SizedBox(height: 8), const Text('Report a rescue to get started', style: TextStyle(fontSize: 12, color: Colors.grey))]))
                : RefreshIndicator(onRefresh: _loadCases, child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: _cases.length, itemBuilder: (_, i) => CaseCard(_cases[i])))
            : SupportWidget(uid: _uid ?? '', role: _role ?? 'customer', name: _name),
      bottomNavigationBar: NavigationBar(selectedIndex: _activeTab, onDestinationSelected: (i) => setState(() => _activeTab = i), destinations: const [
        NavigationDestination(icon: Icon(Icons.folder_outlined), selectedIcon: Icon(Icons.folder), label: 'Cases'),
        NavigationDestination(icon: Icon(Icons.support_agent_outlined), selectedIcon: Icon(Icons.support_agent), label: 'Support'),
      ]),
    );
  }
}
