# Run after: vercel login (must be pawbandhan-tech / pawbandhan-techs-projects team)
Set-Location $PSScriptRoot\..
$projectJson = @{
    projectId = "prj_7Ulm0bcjhPlDolg7S4gbYie4vOpT"
    orgId     = "team_7BQjzL6xAwXolpnEnpEh2oh8"
    projectName = "pawbandhan"
} | ConvertTo-Json
New-Item -ItemType Directory -Force -Path .vercel | Out-Null
$projectJson | Set-Content .vercel\project.json -Encoding utf8
npx vercel@latest deploy --prod --yes
