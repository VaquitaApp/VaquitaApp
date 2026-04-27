# VaquitaApp — setup inicial (Windows, PowerShell 5.1+)
# Ejecutar desde la raíz del repo:  .\scripts\setup.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== VaquitaApp — Setup inicial ===" -ForegroundColor Cyan
Write-Host ""

$RootDir = Split-Path -Parent $PSScriptRoot

# ── 1. Verificar Node.js ──────────────────────────────────────────────────────
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "✗ Node.js no esta instalado." -ForegroundColor Red
    Write-Host "  Descarga Node.js 20 LTS desde https://nodejs.org"
    exit 1
}

$nodeVersion = (node -v).TrimStart("v").Split(".")[0]
if ([int]$nodeVersion -lt 20) {
    Write-Host "✗ Se requiere Node.js 20 o superior. Version actual: $(node -v)" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $(node -v)" -ForegroundColor Green

# ── 2. Instalar dependencias ──────────────────────────────────────────────────
Write-Host "  Instalando dependencias del servidor..."
Set-Location "$RootDir\server"
npm install --silent
Set-Location $RootDir
Write-Host "✓ server/node_modules instalados" -ForegroundColor Green

Write-Host "  Instalando dependencias del cliente..."
Set-Location "$RootDir\client"
npm install --silent
Set-Location $RootDir
Write-Host "✓ client/node_modules instalados" -ForegroundColor Green

# ── 3. Crear server/.env ──────────────────────────────────────────────────────
$serverEnv = "$RootDir\server\.env"
$serverEnvExample = "$RootDir\server\.env.example"

if (-not (Test-Path $serverEnv)) {
    if (-not (Test-Path $serverEnvExample)) {
        Write-Host "✗ No se encontro server\.env.example" -ForegroundColor Red
        exit 1
    }
    Copy-Item $serverEnvExample $serverEnv

    # Generar JWT_SECRET aleatorio
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    (Get-Content $serverEnv) -replace "JWT_SECRET=change_me", "JWT_SECRET=$jwtSecret" |
        Set-Content $serverEnv
    Write-Host "✓ server\.env creado (JWT_SECRET generado automaticamente)" -ForegroundColor Green
} else {
    Write-Host "⚠ server\.env ya existe — no se sobreescribe" -ForegroundColor Yellow
}

# ── 4. Crear client/.env ──────────────────────────────────────────────────────
$clientEnv = "$RootDir\client\.env"
$clientEnvExample = "$RootDir\client\.env.example"

if (-not (Test-Path $clientEnv)) {
    if (-not (Test-Path $clientEnvExample)) {
        Write-Host "✗ No se encontro client\.env.example" -ForegroundColor Red
        exit 1
    }
    Copy-Item $clientEnvExample $clientEnv
    Write-Host "✓ client\.env creado" -ForegroundColor Green
} else {
    Write-Host "⚠ client\.env ya existe — no se sobreescribe" -ForegroundColor Yellow
}

# ── 5. Verificar MongoDB ──────────────────────────────────────────────────────
Write-Host ""
if (Get-Command mongod -ErrorAction SilentlyContinue) {
    $mongoVersion = mongod --version | Select-Object -First 1
    Write-Host "✓ MongoDB instalado: $mongoVersion" -ForegroundColor Green
} else {
    Write-Host "⚠ MongoDB no detectado." -ForegroundColor Yellow
    Write-Host "  Descarga MongoDB Community desde https://www.mongodb.com/try/download/community"
    Write-Host "  Durante la instalacion, selecciona 'Install MongoDB as a Service'"
}

# ── 6. Verificar Mailpit ──────────────────────────────────────────────────────
if (Get-Command mailpit -ErrorAction SilentlyContinue) {
    Write-Host "✓ Mailpit instalado" -ForegroundColor Green
} else {
    Write-Host "⚠ Mailpit no detectado." -ForegroundColor Yellow
    Write-Host "  Descarga mailpit.exe desde https://github.com/axllent/mailpit/releases"
    Write-Host "  Copia mailpit.exe a una carpeta en tu PATH (ej. C:\Windows\System32)"
}

# ── Resumen ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Setup completado ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ejecutar la aplicacion necesitas 4 terminales:"
Write-Host ""
Write-Host "  Terminal 1 — MongoDB"
Write-Host "    net start MongoDB"
Write-Host "    (o abre MongoDB Compass, o ejecuta: mongod --dbpath C:\data\db)"
Write-Host ""
Write-Host "  Terminal 2 — Mailpit"
Write-Host "    mailpit"
Write-Host ""
Write-Host "  Terminal 3 — Backend"
Write-Host "    cd server ; npm run dev"
Write-Host ""
Write-Host "  Terminal 4 — Frontend"
Write-Host "    cd client ; npm run dev"
Write-Host ""
Write-Host "URLs:"
Write-Host "  App:     http://localhost:5173"
Write-Host "  API:     http://localhost:3001/api/health"
Write-Host "  Emails:  http://localhost:8025"
Write-Host ""
Write-Host "Tests:"
Write-Host "  cd server ; npm test"
Write-Host ""
