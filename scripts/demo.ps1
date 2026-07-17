Set-Location $PSScriptRoot\..

$env:DEMO_MODE = "true"
if (-not (Test-Path .env)) {
  @"
DEMO_MODE=true
DATABASE_URL="file:./dev.db"
AUTH_SECRET=demo-local-secret
AUTH_URL=http://localhost:3000
"@ | Set-Content .env -Encoding utf8
}

if (-not (Test-Path node_modules)) { npm install }
if (-not (Test-Path prisma\dev.db)) { npm run db:setup }

Write-Host "Demo startet auf http://localhost:3000 (ohne Login)"
npm run dev
