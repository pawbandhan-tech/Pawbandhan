# Link this repo to the CORRECT Vercel project (pawbandhan-tech — NOT memorial foundation).
# Run from repo root:  powershell -ExecutionPolicy Bypass -File scripts/link-pawbandhan-vercel.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "PawBandhan Vercel link" -ForegroundColor Cyan
Write-Host "Target team:  pawbandhan-techs-projects"
Write-Host "Target project: pawbandhan"
Write-Host "Dashboard:    https://vercel.com/pawbandhan-techs-projects/pawbandhan"
Write-Host ""
Write-Host "Do NOT deploy to vdgogatememorialfoundation — that is the wrong account." -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".vercel") {
    Write-Host "Removing old .vercel link..." -ForegroundColor DarkYellow
    Remove-Item -Recurse -Force ".vercel"
}

Write-Host "If link fails, run:  npx vercel login" -ForegroundColor Yellow
Write-Host "Use the pawbandhan-tech GitHub/Vercel account (not memorial foundation)."
Write-Host ""

npx vercel link --scope pawbandhan-techs-projects --project pawbandhan --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Scope not found — you are likely logged into the wrong Vercel account." -ForegroundColor Red
    Write-Host "1. npx vercel logout"
    Write-Host "2. npx vercel login  (use pawbandhan-tech account)"
    Write-Host "3. Re-run this script"
    Write-Host ""
    Write-Host "Or connect GitHub repo in dashboard:" -ForegroundColor Cyan
    Write-Host "  https://vercel.com/pawbandhan-techs-projects/pawbandhan"
    exit 1
}

Write-Host ""
Write-Host "Done. Deploy with:" -ForegroundColor Green
Write-Host "  npx vercel deploy --prod --scope pawbandhan-techs-projects"
Write-Host ""
Write-Host "Ensure DATABASE_URL (Neon) is set under pawbandhan-tech project settings."
Write-Host ""
