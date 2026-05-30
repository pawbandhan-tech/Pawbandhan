// Initialize dummy data for testing
function initDummyData() {
    // NGOs
    let ngos = [];
    let ngoRiders = [];
    let incidents = [];
    
    // Check if data already exists
    if(localStorage.getItem('admin_ngos') && JSON.parse(localStorage.getItem('admin_ngos')).length > 0) {
        console.log('Data already exists, skipping initialization');
        return;
    }
    
    // Create NGOs
    ngos = [
        {
            id: 'NGO001',
            name: 'Animal Rescue Foundation Mumbai',
            email: 'mumbai@animalrescue.org',
            password: 'ngo123',
            phone: '9876543210',
            address: 'Andheri West, Mumbai',
            serviceArea: 'Mumbai Suburban',
            prn: 'PRN2024001',
            status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'NGO002',
            name: 'Delhi Animal Protection League',
            email: 'delhi@animalprotection.org',
            password: 'ngo123',
            phone: '9876543211',
            address: 'Connaught Place, New Delhi',
            serviceArea: 'Delhi NCR',
            prn: 'PRN2024002',
            status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'NGO003',
            name: 'Bangalore Paws Rescue',
            email: 'bangalore@pawsrescue.org',
            password: 'ngo123',
            phone: '9876543212',
            address: 'Indiranagar, Bangalore',
            serviceArea: 'Bangalore Urban',
            prn: 'PRN2024003',
            status: 'active',
            createdAt: new Date().toISOString()
        },
        {
            id: 'NGO004',
            name: 'Pune Animal Welfare Trust',
            email: 'pune@animalwelfare.org',
            password: 'ngo123',
            phone: '9876543213',
            address: 'Koregaon Park, Pune',
            serviceArea: 'Pune City',
            prn: 'PRN2024004',
            status: 'pending',
            createdAt: new Date().toISOString()
        }
    ];
    
    // Create Riders for each NGO
    ngoRiders = [
        // Mumbai NGO Riders
        { id: 'RDR1001', ngo_id: 'NGO001', name: 'Vikram Singh', phone: '9988776655', email: 'vikram@rescue.com', vehicle: 'Bike', rescues: 45, is_available: true },
        { id: 'RDR1002', ngo_id: 'NGO001', name: 'Rajesh Patil', phone: '9988776644', email: 'rajesh@rescue.com', vehicle: 'Scooter', rescues: 32, is_available: true },
        { id: 'RDR1003', ngo_id: 'NGO001', name: 'Meena Sharma', phone: '9988776633', email: 'meena@rescue.com', vehicle: 'Bike', rescues: 28, is_available: false },
        
        // Delhi NGO Riders
        { id: 'RDR2001', ngo_id: 'NGO002', name: 'Amit Kumar', phone: '8877665544', email: 'amit@delhirescue.com', vehicle: 'Bike', rescues: 67, is_available: true },
        { id: 'RDR2002', ngo_id: 'NGO002', name: 'Neha Gupta', phone: '8877665533', email: 'neha@delhirescue.com', vehicle: 'Scooter', rescues: 41, is_available: true },
        
        // Bangalore NGO Riders
        { id: 'RDR3001', ngo_id: 'NGO003', name: 'Ravi Kumar', phone: '7766554433', email: 'ravi@bangalorerescue.com', vehicle: 'Bike', rescues: 53, is_available: true },
        { id: 'RDR3002', ngo_id: 'NGO003', name: 'Priya Reddy', phone: '7766554422', email: 'priya@bangalorerescue.com', vehicle: 'Car', rescues: 39, is_available: true },
        { id: 'RDR3003', ngo_id: 'NGO003', name: 'Suresh Nair', phone: '7766554411', email: 'suresh@bangalorerescue.com', vehicle: 'Bike', rescues: 22, is_available: false }
    ];
    
    // Create sample incidents
    incidents = [
        {
            incident_code: 'PB1735800123456',
            user_email: 'test@example.com',
            incident_type: 'accident',
            animal_type: 'dog',
            description: 'Dog hit by auto on MG Road, needs immediate medical attention',
            latitude: 19.0760,
            longitude: 72.8777,
            address: 'MG Road, Near Metro Station, Mumbai',
            status: 'pending',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            images: []
        },
        {
            incident_code: 'PB1735800234567',
            user_email: 'user2@example.com',
            incident_type: 'injured',
            animal_type: 'cat',
            description: 'Cat with broken leg near Sector 15 market',
            latitude: 28.6139,
            longitude: 77.2090,
            address: 'Sector 15 Market, Near Police Station, Delhi',
            status: 'pending',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            images: []
        },
        {
            incident_code: 'PB1735800345678',
            user_email: 'user3@example.com',
            incident_type: 'sick',
            animal_type: 'cow',
            description: 'Cow struggling in drain, needs rescue',
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'Indiranagar Main Road, Bangalore',
            status: 'assigned',
            assigned_at: new Date(Date.now() - 1800000).toISOString(),
            rider_id: 'RDR1001',
            rider_name: 'Vikram Singh',
            rider_phone: '9988776655',
            ngo_name: 'Animal Rescue Foundation Mumbai',
            created_at: new Date(Date.now() - 10800000).toISOString(),
            images: []
        },
        {
            incident_code: 'PB1735800456789',
            user_email: 'user4@example.com',
            incident_type: 'pregnant',
            animal_type: 'dog',
            description: 'Pregnant dog in distress near railway station',
            latitude: 18.5204,
            longitude: 73.8567,
            address: 'Railway Station Road, Pune',
            status: 'pending',
            created_at: new Date(Date.now() - 5400000).toISOString(),
            images: []
        }
    ];
    
    // Save to localStorage
    localStorage.setItem('admin_ngos', JSON.stringify(ngos));
    localStorage.setItem('ngo_riders', JSON.stringify(ngoRiders));
    localStorage.setItem('app_incidents', JSON.stringify(incidents));
    localStorage.setItem('ngos_initialized', 'true');
    
    console.log('Dummy data initialized successfully!');
    console.log('NGOs created: 4');
    console.log('Riders created: 8');
    console.log('Incidents created: 4');
}

initDummyData();
