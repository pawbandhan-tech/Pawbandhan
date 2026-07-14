import 'package:flutter/material.dart';
import '../models/case_model.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class CaseDetailScreen extends StatefulWidget {
  final CaseModel caseData;
  const CaseDetailScreen({super.key, required this.caseData});

  @override
  State<CaseDetailScreen> createState() => _CaseDetailScreenState();
}

class _CaseDetailScreenState extends State<CaseDetailScreen> {
  final _api = ApiService();
  List<dynamic> _timeline = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    if (widget.caseData.incidentCode != null) _loadTimeline();
  }

  Future<void> _loadTimeline() async {
    try {
      final data = await _api.get(ApiConfig.caseTracking(widget.caseData.incidentCode!));
      setState(() { _timeline = data['timeline'] ?? []; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.caseData.displayId, style: const TextStyle(fontFamily: 'monospace'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _buildHeader(),
        const SizedBox(height: 16),
        Text('Timeline', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._timeline.map((t) => _buildTimelineItem(t)),
      ]),
    );
  }

  Widget _buildHeader() {
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [const Text('🐾', style: TextStyle(fontSize: 40)), const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(widget.caseData.animalType ?? 'Unknown', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          Text(widget.caseData.displayId, style: const TextStyle(fontFamily: 'monospace', fontSize: 13, color: Colors.grey)),
        ])),
      ]),
      const Divider(height: 24),
      _InfoRow('Status', widget.caseData.status),
      _InfoRow('Workflow', widget.caseData.workflowStatus?.replaceAll('_', ' ')),
      if (widget.caseData.ngoName != null) _InfoRow('NGO', widget.caseData.ngoName!),
      if (widget.caseData.doctorName != null) _InfoRow('Veterinarian', widget.caseData.doctorName!),
      if (widget.caseData.repName != null) _InfoRow('Rider', widget.caseData.repName!),
      if (widget.caseData.estimatedCost != null) _InfoRow('Est. Cost', '₹${widget.caseData.estimatedCost}'),
      if (widget.caseData.paymentStatus != null) _InfoRow('Payment', widget.caseData.paymentStatus!),
    ])));
  }

  Widget _buildTimelineItem(Map<String, dynamic> item) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF8B5CF6), border: Border.all(color: Colors.white, width: 2))),
          Container(width: 2, height: 40, color: Colors.grey[300]),
        ]),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(item['status']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          if (item['note'] != null) Text(item['note'].toString(), style: const TextStyle(fontSize: 11, color: Colors.grey)),
          Text(item['createdAt']?.toString() ?? '', style: const TextStyle(fontSize: 10, color: Colors.grey)),
          const SizedBox(height: 8),
        ])),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) => super.build(context);
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);
  @override
  Widget build(BuildContext context) {
    return Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
      Text('$label: ', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey)),
      Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
    ]));
  }
}
