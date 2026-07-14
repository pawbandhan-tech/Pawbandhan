class ApiConfig {
  static const String baseUrl = 'https://pawbandhan.onrender.com';
  static const String apiPrefix = '/api';

  // Auth
  static const String loginCustomer = '$baseUrl$apiPrefix/auth/customer';
  static const String loginPartner = '$baseUrl$apiPrefix/auth/partner';

  // Dashboard
  static const String casesUser = '$baseUrl$apiPrefix/users/[uid]/cases-track';
  static const String doctorData = '$baseUrl$apiPrefix/doctors';
  static const String ngoData = '$baseUrl$apiPrefix/ngos';
  static const String repData = '$baseUrl$apiPrefix/reps';

  // Admin
  static const String adminLogin = '$baseUrl$apiPrefix/admin/login';
  static const String adminMe = '$baseUrl$apiPrefix/admin/me';
  static const String adminCases = '$baseUrl$apiPrefix/admin/cases';
  static const String adminUpdateCase = '$baseUrl$apiPrefix/admin/update-case';
  static const String adminAccounts = '$baseUrl$apiPrefix/admin/all-accounts';
  static const String adminSupport = '$baseUrl$apiPrefix/admin/support';
  static const String adminStats = '$baseUrl$apiPrefix/stats';
  static const String adminConfig = '$baseUrl$apiPrefix/admin/site-config';

  // Support
  static const String supportTickets = '$baseUrl$apiPrefix/support/tickets';
  static const String supportReply = '$baseUrl$apiPrefix/support/reply';

  // Case
  static String caseTracking(String code) => '$baseUrl$apiPrefix/incidents/$code/tracking';
  static String casePhotos(String code) => '$baseUrl$apiPrefix/cases/$code/photos';

  // Donation
  static const String donateCases = '$baseUrl$apiPrefix/donate/cases';
  static String donateCase(String code) => '$baseUrl$apiPrefix/donate/$code';
}
