class TicketModel {
  final int id;
  final String? ticketCode;
  final String? subject;
  final String? description;
  final String? category;
  final String? priority;
  final String? status;
  final String? creatorName;
  final String? assignedTo;
  final String? createdAt;
  final int replyCount;
  final bool isLiveChat;

  TicketModel({
    required this.id,
    this.ticketCode,
    this.subject,
    this.description,
    this.category,
    this.priority,
    this.status,
    this.creatorName,
    this.assignedTo,
    this.createdAt,
    this.replyCount = 0,
    this.isLiveChat = false,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] ?? 0,
      ticketCode: json['ticketCode'],
      subject: json['subject'],
      description: json['description'],
      category: json['category'],
      priority: json['priority'],
      status: json['status'],
      creatorName: json['creatorName'],
      assignedTo: json['assignedTo'],
      createdAt: json['createdAt'],
      replyCount: (json['replies'] as List?)?.length ?? 0,
      isLiveChat: json['isLiveChat'] == true,
    );
  }
}
