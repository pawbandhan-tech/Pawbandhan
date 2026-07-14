import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';
import '../models/ticket_model.dart';

class SupportWidget extends StatefulWidget {
  final String uid;
  final String role;
  final String? name;
  final bool isAdmin;

  const SupportWidget({super.key, required this.uid, required this.role, this.name, this.isAdmin = false});

  @override
  State<SupportWidget> createState() => _SupportWidgetState();
}

class _SupportWidgetState extends State<SupportWidget> {
  final _api = ApiService();
  List<TicketModel> _tickets = [];
  bool _loading = true;
  final _subjectCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  @override
  void initState() { super.initState(); _loadTickets(); }

  Future<void> _loadTickets() async {
    setState(() => _loading = true);
    try {
      final url = widget.isAdmin ? ApiConfig.adminSupport : '${ApiConfig.supportTickets}?${widget.uid.isNotEmpty ? 'uid=${widget.uid}' : ''}';
      final data = await _api.get(url);
      final list = widget.isAdmin ? (data['tickets'] ?? data) : data;
      setState(() => _tickets = (list as List).map((e) => TicketModel.fromJson(e is Map<String, dynamic> ? e : {})).toList());
    } catch (_) {}
    setState(() => _loading = false);
  }

  Future<void> _createTicket() async {
    final subject = _subjectCtrl.text.trim();
    final desc = _descCtrl.text.trim();
    if (subject.isEmpty || desc.isEmpty) return;
    try {
      await _api.post(ApiConfig.supportTickets, {'subject': subject, 'description': desc, 'category': 'general', 'priority': 'medium', 'creatorUid': widget.uid, 'creatorEmail': '', 'creatorName': widget.name ?? 'User', 'createdBy': widget.role, 'isLiveChat': false});
      _subjectCtrl.clear(); _descCtrl.clear();
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ticket created!')));
      _loadTickets();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'open': return Colors.orange;
      case 'in_progress': return Colors.blue;
      case 'resolved': return Colors.green;
      case 'closed': return Colors.grey;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(widget.isAdmin ? 'All Tickets' : 'My Tickets', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        IconButton(onPressed: () => _showCreateDialog(), icon: const Icon(Icons.add_circle, color: Color(0xFF8B5CF6))),
      ]),
      if (_loading) const Center(child: CircularProgressIndicator()) else
        _tickets.isEmpty ? const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('No tickets yet', style: TextStyle(color: Colors.grey)))) :
        ListView.builder(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), itemCount: _tickets.length, itemBuilder: (_, i) {
          final t = _tickets[i];
          return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
            title: Text(t.subject ?? 'No subject', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            subtitle: Text(
              '${t.ticketCode ?? ''} • ${t.createdAt != null ? DateTime.parse(t.createdAt!).toString().split('.')[0] : ''}',
              style: const TextStyle(fontSize: 11),
            ),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              Chip(label: Text(t.status!.replaceAll('_', ' '), style: const TextStyle(fontSize: 10, color: Colors.white)), backgroundColor: _statusColor(t.status!), padding: EdgeInsets.zero),
              const SizedBox(width: 4),
              Text('${t.replyCount}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ]),
          ));
        }),
    ]);
  }

  void _showCreateDialog() {
    showDialog(context: context, builder: (_) => AlertDialog(
      title: const Text('New Support Ticket'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: _subjectCtrl, decoration: const InputDecoration(labelText: 'Subject', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        TextField(controller: _descCtrl, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()), maxLines: 3),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(onPressed: _createTicket, child: const Text('Submit')),
      ],
    ));
  }

  @override
  void dispose() { _subjectCtrl.dispose(); _descCtrl.dispose(); super.dispose(); }
}
