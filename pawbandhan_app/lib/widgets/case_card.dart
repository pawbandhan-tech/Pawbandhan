import 'package:flutter/material.dart';
import '../models/case_model.dart';

class CaseCard extends StatelessWidget {
  final CaseModel caseData;
  const CaseCard(this.caseData, {super.key});

  Color _statusColor() {
    switch (caseData.workflowStatus) {
      case 'reported': case 'open': return Colors.orange;
      case 'in_treatment': case 'in_progress': return Colors.red;
      case 'closed': case 'resolved': case 'delivered': return Colors.green;
      default: return Colors.blue;
    }
  }

  String _animalIcon() {
    switch (caseData.animalType?.toLowerCase()) {
      case 'dog': return '🐕'; case 'cat': return '🐱'; case 'cow': return '🐄';
      case 'buffalo': return '🐃'; case 'horse': return '🐴'; case 'goat': return '🐐';
      case 'bird': return '🐦'; case 'snake': return '🐍'; default: return '🐾';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(_animalIcon(), style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              RichText(text: TextSpan(style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: Colors.grey), children: [
                TextSpan(text: caseData.idPrefix + '-'),
                TextSpan(text: caseData.last4, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF8B5CF6))),
              ])),
              Text(caseData.animalType ?? 'Unknown', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            ])),
            Chip(label: Text(caseData.workflowStatus?.replaceAll('_', ' ') ?? caseData.status ?? 'unknown', style: const TextStyle(fontSize: 10, color: Colors.white)), backgroundColor: _statusColor(), padding: EdgeInsets.zero),
          ]),
          if (caseData.description != null) ...[const SizedBox(height: 8), Text(caseData.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Colors.grey))],
          const SizedBox(height: 8),
          LinearProgressIndicator(value: _workflowProgress(), color: _statusColor(), backgroundColor: Colors.grey[200]),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(caseData.workflowStatus?.replaceAll('_', ' ') ?? 'Pending', style: const TextStyle(fontSize: 10, color: Colors.grey)),
            if (caseData.paymentStatus != null) Chip(label: Text(caseData.paymentStatus!, style: const TextStyle(fontSize: 9)), padding: const EdgeInsets.symmetric(horizontal: 6)),
          ]),
        ]),
      ),
    );
  }

  double _workflowProgress() {
    const stages = ['reported', 'ngo_assigned', 'ngo_accepted', 'rider_dispatched', 'rider_picking', 'animal_picked', 'en_route_vet', 'at_vet', 'pre_treatment', 'in_treatment', 'post_treatment', 'payment_pending', 'ready_for_drop', 'rider_dropping', 'delivered', 'closed'];
    final idx = stages.indexOf(caseData.workflowStatus ?? '');
    return idx >= 0 ? (idx + 1) / stages.length : 0;
  }
}
