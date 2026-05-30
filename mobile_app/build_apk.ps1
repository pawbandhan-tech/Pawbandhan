Write-Host "========================================" -ForegroundColor Green
Write-Host "Building PawBandhan Rider APK" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Navigate to mobile app directory
Set-Location "E:\Dog App\mobile_app"

# Check if Node.js is installed
$nodeVersion = node -v
if ($nodeVersion) {
    Write-Host "? Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "? Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit
}

# Install dependencies
Write-Host ""
Write-Host "?? Installing dependencies..." -ForegroundColor Yellow
npm install

# Create www directory if not exists
if (-not (Test-Path "www")) {
    New-Item -ItemType Directory -Path "www" -Force
}

# Copy the rider app to www
Write-Host ""
Write-Host "?? Copying app files..." -ForegroundColor Yellow
Copy-Item "..\web_app\rider_app.html" -Destination "www\rider_app.html" -Force

# Initialize Capacitor
Write-Host ""
Write-Host "?? Initializing Capacitor..." -ForegroundColor Yellow
npx cap init PawBandhanRider com.pawbandhan.rider --web-dir=www

# Add Android platform
Write-Host ""
Write-Host "?? Adding Android platform..." -ForegroundColor Yellow
npx cap add android

# Sync files
Write-Host ""
Write-Host "?? Syncing files..." -ForegroundColor Yellow
npx cap sync

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To build APK, follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Android Studio:" -ForegroundColor White
Write-Host "   npx cap open android" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. In Android Studio:" -ForegroundColor White
Write-Host "   - Wait for Gradle sync to complete" -ForegroundColor Gray
Write-Host "   - Go to Build ? Build Bundle(s) / APK(s) ? Build APK(s)" -ForegroundColor Gray
Write-Host "   - APK will be generated at: android/app/build/outputs/apk/debug/" -ForegroundColor Gray
Write-Host ""
Write-Host "3. OR Build via command line:" -ForegroundColor White
Write-Host "   cd android && ./gradlew assembleDebug" -ForegroundColor Cyan
Write-Host ""

Write-Host "?? APK Location after build:" -ForegroundColor Green
Write-Host "   E:\Dog App\mobile_app\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""

# Open Android Studio if available
$androidStudioPath = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
if (Test-Path $androidStudioPath) {
    Write-Host "Opening Android Studio..." -ForegroundColor Cyan
    Start-Process $androidStudioPath "E:\Dog App\mobile_app\android"
} else {
    Write-Host "Android Studio not found. Please install Android Studio from https://developer.android.com/studio" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
