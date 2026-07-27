# CSP Strategie Selbsteinschätzung — Erstinstallation
Set-Location $PSScriptRoot\..

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Bitte .env mit Keycloak-Werten fuellen (siehe README), dann erneut ausfuehren."
  exit 1
}

npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run db:setup
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Fertig. Start mit: npm run dev"
Write-Host "App: http://localhost:3000"
