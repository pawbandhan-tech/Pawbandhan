// Firebase Configuration
const firebaseConfig = {
    apiKey: 'AIzaSyDRuOTikCSLCdb73oYSnrnhoEiKbv-6Ozc',
    authDomain: 'pawbandhan-29f84.firebaseapp.com',
    projectId: 'pawbandhan-29f84',
    storageBucket: 'pawbandhan-29f84.firebasestorage.app',
    messagingSenderId: '378867729624',
    appId: '1:378867729624:web:2371a816457fdcfe2303ad',
    measurementId: 'G-N3PR51QSHV'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Global variables
let currentUser = null;
let map = null;
let markers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    loadStatistics();
    loadNews();
    loadTeamMembers();
    setupEventListeners();
});

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserDashboard();
        }
    });
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch('http://localhost:5000/api/stats');
        const data = await response.json();
        
        document.getElementById('rescuesCount').textContent = data.totalRescues.toLocaleString();
        document.getElementById('ngosCount').textContent = data.totalNGOs.toLocaleString();
        document.getElementById('doctorsCount').textContent = data.totalDoctors.toLocaleString();
        document.getElementById('volunteersCount').textContent = data.totalVolunteers.toLocaleString();
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load news
async function loadNews() {
    const newsContainer = document.getElementById('newsContainer');
    try {
        const response = await fetch('http://localhost:5000/api/news');
        const news = await response.json();
        
        newsContainer.innerHTML = news.map(item => 
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <img src="" class="card-img-top" alt="">
                    <div class="card-body">
                        <h5 class="card-title"></h5>
                        <p class="card-text"></p>
                        <small class="text-muted"></small>
                    </div>
                </div>
            </div>
        ).join('');
    } catch (error) {
        console.error('Error loading news:', error);
    }
}

// Load team members
async function loadTeamMembers() {
    const teamContainer = document.getElementById('teamContainer');
    try {
        const response = await fetch('http://localhost:5000/api/team');
        const team = await response.json();
        
        teamContainer.innerHTML = team.map(member => 
            <div class="col-md-3 mb-4">
                <div class="card text-center h-100">
                    <img src="" class="card-img-top rounded-circle mx-auto mt-3" style="width: 150px; height: 150px; object-fit: cover;" alt="">
                    <div class="card-body">
                        <h5 class="card-title"></h5>
                        <p class="card-text text-muted"></p>
                        <div class="social-links">
                            <a href="" target="_blank"><i class="fab fa-linkedin"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        ).join('');
    } catch (error) {
        console.error('Error loading team:', error);
    }
}

// Report incident
function reportIncident() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    window.location.href = '/dashboard.html';
}

// Process donation
async function processDonation() {
    const amount = document.getElementById('customDonation').value;
    if (!amount || amount < 10) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: parseInt(amount) })
        });
        
        const order = await response.json();
        
        // Initialize Razorpay
        const options = {
            key: 'YOUR_RAZORPAY_KEY',
            amount: order.amount,
            currency: 'INR',
            name: 'PawBandhan',
            description: 'Donation for Animal Welfare',
            order_id: order.id,
            handler: function(response) {
                verifyPayment(response);
            }
        };
        
        const razorpay = new Razorpay(options);
        razorpay.open();
    } catch (error) {
        console.error('Error processing donation:', error);
        showToast('Something went wrong. Please try again.', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSignup();
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }
}

// Handle signup
async function handleSignup() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phoneNo = document.getElementById('phoneNo').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Create user in Firebase
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate unique 12-digit account number
        const accountNo = generateAccountNumber();
        
        // Save user details to backend
        const response = await fetch('http://localhost:5000/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: user.uid,
                firstName,
                lastName,
                phoneNo,
                email,
                accountNo
            })
        });
        
        if (response.ok) {
            // Send OTP verification
            await sendOTP(phoneNo);
            showToast('Registration successful! Please verify OTP.', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Signup error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Handle login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    showLoading();
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Login successful!', 'success');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1000);
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Generate unique account number
function generateAccountNumber() {
    return 'PB' + Date.now() + Math.floor(Math.random() * 1000);
}

// Send OTP
async function sendOTP(phoneNo) {
    try {
        const response = await fetch('http://localhost:5000/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNo })
        });
        return await response.json();
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastHTML = 
        <div class="toast align-items-center text-white bg- border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    ;
    
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    toastContainer.innerHTML = toastHTML;
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    setTimeout(() => {
        toastContainer.innerHTML = '';
    }, 3000);
}

// Create toast container
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-notification';
    document.body.appendChild(container);
    return container;
}

// Show/hide loading
function showLoading() {
    let spinner = document.getElementById('globalSpinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'globalSpinner';
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Show auth modal
function showAuthModal() {
    const modal = new bootstrap.Modal(document.getElementById('authModal'));
    modal.show();
}

// Expose functions globally
window.reportIncident = reportIncident;
window.processDonation = processDonation;
window.setDonation = (amount) => {
    document.getElementById('customDonation').value = amount;
};
