-- Complete PawBandhan Database Schema (Fixed)

-- Users table (customers)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_no VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    account_no VARCHAR(50) UNIQUE,
    address TEXT,
    profile_image TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NGOs table
CREATE TABLE IF NOT EXISTS ngos (
    id SERIAL PRIMARY KEY,
    ngo_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    registration_no VARCHAR(100),
    kyc_status VARCHAR(50) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Riders/Volunteers table
CREATE TABLE IF NOT EXISTS riders (
    id SERIAL PRIMARY KEY,
    rider_code VARCHAR(50) UNIQUE NOT NULL,
    ngo_id INTEGER REFERENCES ngos(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT true,
    kyc_verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 5.0,
    total_rescues INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors/Veterinarians table
CREATE TABLE IF NOT EXISTS doctors (
    id SERIAL PRIMARY KEY,
    doctor_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    registration_no VARCHAR(100),
    specialization VARCHAR(100),
    clinic_name VARCHAR(255),
    clinic_address TEXT,
    clinic_latitude DECIMAL(10, 8),
    clinic_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Animals table
CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    animal_code VARCHAR(50) UNIQUE NOT NULL,
    animal_type VARCHAR(50),
    name VARCHAR(100),
    age INTEGER,
    sex VARCHAR(10),
    breed VARCHAR(100),
    color VARCHAR(50),
    barcode TEXT,
    ngo_id INTEGER REFERENCES ngos(id),
    owner_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents/Cases table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    ngo_id INTEGER REFERENCES ngos(id),
    rider_id INTEGER REFERENCES riders(id),
    doctor_id INTEGER REFERENCES doctors(id),
    animal_id INTEGER REFERENCES animals(id),
    incident_type VARCHAR(50),
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    animal_type VARCHAR(50),
    animal_condition VARCHAR(100),
    images TEXT[],
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    otp_code VARCHAR(10),
    assigned_at TIMESTAMP,
    accepted_at TIMESTAMP,
    arrived_at TIMESTAMP,
    doctor_assigned_at TIMESTAMP,
    treatment_started_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    fir_filed BOOLEAN DEFAULT false,
    fir_number VARCHAR(100),
    police_station VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case timeline table
CREATE TABLE IF NOT EXISTS case_timeline (
    id SERIAL PRIMARY KEY,
    incident_code VARCHAR(50) REFERENCES incidents(incident_code),
    event_type VARCHAR(50),
    event_description TEXT,
    event_images TEXT[],
    event_data JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Medical reports table
CREATE TABLE IF NOT EXISTS medical_reports (
    id SERIAL PRIMARY KEY,
    report_code VARCHAR(50) UNIQUE NOT NULL,
    incident_code VARCHAR(50) REFERENCES incidents(incident_code),
    animal_code VARCHAR(50),
    doctor_id INTEGER REFERENCES doctors(id),
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    test_reports TEXT[],
    scan_reports TEXT[],
    pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    ngo_id INTEGER REFERENCES ngos(id),
    rider_id INTEGER REFERENCES riders(id),
    doctor_id INTEGER REFERENCES doctors(id),
    incident_code VARCHAR(50) REFERENCES incidents(incident_code),
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Police complaints table
CREATE TABLE IF NOT EXISTS police_complaints (
    id SERIAL PRIMARY KEY,
    complaint_code VARCHAR(50) UNIQUE NOT NULL,
    incident_code VARCHAR(50) REFERENCES incidents(incident_code),
    fir_number VARCHAR(100),
    police_station VARCHAR(255),
    jurisdiction VARCHAR(255),
    complaint_text TEXT,
    status VARCHAR(50) DEFAULT 'filed',
    filed_by INTEGER REFERENCES users(id),
    filed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_user ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_ngo ON incidents(ngo_id);
CREATE INDEX IF NOT EXISTS idx_incidents_rider ON incidents(rider_id);
CREATE INDEX IF NOT EXISTS idx_riders_location ON riders(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_ngos_location ON ngos(latitude, longitude);
