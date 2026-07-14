class CaseModel {
  final int id;
  final String? incidentCode;
  final String? animalType;
  final String? status;
  final String? workflowStatus;
  final String? description;
  final String? injuryType;
  final double? estimatedCost;
  final double? finalCost;
  final String? paymentStatus;
  final String? ngoName;
  final String? doctorName;
  final String? repName;
  final String? createdAt;
  final List<String>? images;
  final double? latitude;
  final double? longitude;

  CaseModel({
    required this.id,
    this.incidentCode,
    this.animalType,
    this.status,
    this.workflowStatus,
    this.description,
    this.injuryType,
    this.estimatedCost,
    this.finalCost,
    this.paymentStatus,
    this.ngoName,
    this.doctorName,
    this.repName,
    this.createdAt,
    this.images,
    this.latitude,
    this.longitude,
  });

  factory CaseModel.fromJson(Map<String, dynamic> json) {
    return CaseModel(
      id: json['id'] ?? 0,
      incidentCode: json['incidentCode'],
      animalType: json['animalType'],
      status: json['status'],
      workflowStatus: json['workflowStatus'],
      description: json['description'],
      injuryType: json['injuryType'],
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble(),
      finalCost: (json['finalCost'] as num?)?.toDouble(),
      paymentStatus: json['paymentStatus'],
      ngoName: json['ngoName'],
      doctorName: json['doctorName'],
      repName: json['repName'],
      createdAt: json['createdAt'],
      images: (json['images'] as List?)?.map((e) => e.toString()).toList(),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }

  String get displayId => incidentCode ?? '#$id';
  String get last4 => displayId.split('-').last;
  String get idPrefix {
    final parts = displayId.split('-');
    parts.removeLast();
    return parts.join('-');
  }
}
