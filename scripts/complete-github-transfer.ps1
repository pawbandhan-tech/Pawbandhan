# Run after: gh auth login (add pawbandhan-tech account) AND gh auth refresh -s delete_repo (vdgogatememorialfoundation)
# Accepts pending Pawbandhan transfer, pushes main, deletes memorial-foundation copy.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== Step 1: Accept transfer as pawbandhan-tech ===" -ForegroundColor Cyan
gh auth switch -u pawbandhan-tech 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Add account: gh auth login  (sign in as pawbandhan-tech)" -ForegroundColor Yellow
    exit 1
}

$invites = gh api user/repository_invitations 2>$null | ConvertFrom-Json
foreach ($i in $invites) {
    if ($i.repository.name -match "Pawbandhan" -or $i.repository.full_name -match "Pawbandhan") {
        Write-Host "Accepting invitation $($i.id) for $($i.repository.full_name)"
        gh api --method PATCH "user/repository_invitations/$($i.id)" | Out-Null
    }
}

Start-Sleep -Seconds 2
$dest = gh api repos/pawbandhan-tech/Pawbandhan --jq .full_name 2>$null
if (-not $dest) {
    Write-Host "Repo pawbandhan-tech/Pawbandhan not found yet. Accept transfer in GitHub notifications, then re-run." -ForegroundColor Yellow
    exit 1
}
Write-Host "Transfer OK: $dest" -ForegroundColor Green

Write-Host "=== Step 2: Push latest main ===" -ForegroundColor Cyan
git remote set-url origin https://github.com/pawbandhan-tech/Pawbandhan.git
git push -u origin main

Write-Host "=== Step 3: Delete memorial-foundation repo ===" -ForegroundColor Cyan
gh auth switch -u vdgogatememorialfoundation
gh auth refresh -h github.com -s delete_repo 2>$null
gh repo delete vdgogatememorialfoundation/Pawbandhan --yes

Write-Host "Done. GitHub: https://github.com/pawbandhan-tech/Pawbandhan" -ForegroundColor Green
