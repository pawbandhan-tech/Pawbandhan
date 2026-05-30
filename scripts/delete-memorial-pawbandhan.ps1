# Deletes leftover PawBandhan copy on vdgogatememorialfoundation (run after: gh auth refresh -s delete_repo)
$ErrorActionPreference = "Stop"
gh auth switch -u vdgogatememorialfoundation
gh auth refresh -h github.com -s delete_repo
gh repo delete vdgogatememorialfoundation/pawbandhan-memorial-archive --yes
Write-Host "Deleted vdgogatememorialfoundation/pawbandhan-memorial-archive" -ForegroundColor Green
