Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO CONFIGURACION DE NEXO DESKTOP" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERROR: Node.js no está instalado." -ForegroundColor Red
    Write-Host "Por favor instala Node.js primero desde: https://nodejs.org/" -ForegroundColor Yellow
    exit
}
Write-Host "✅ Node.js / npm detectado." -ForegroundColor Green

# 2. Check Rust
if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
    Write-Host "⚙️ Instalando Rust y Cargo..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "rustup-init.exe"
    .\rustup-init.exe -y
    Remove-Item "rustup-init.exe"
    
    # Reload Path variable for current session
    $env:Path += ";$env:USERPROFILE\.cargo\bin"
    Write-Host "✅ Rust instalado correctamente." -ForegroundColor Green
} else {
    Write-Host "✅ Rust detectado." -ForegroundColor Green
}

# 3. Dependencias de C++ Build Tools (Requerido por Tauri en Windows)
Write-Host "⚠️ Si es la primera vez que usas Tauri en Windows, asegúrate de tener instaladas las 'C++ Build Tools' de Visual Studio." -ForegroundColor Yellow

# 4. Install Node packages
Write-Host ""
Write-Host "📦 Instalando dependencias del proyecto (npm install)..." -ForegroundColor Cyan
npm install

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "✨ ¡ENTORNO CONFIGURADO CON EXITO! ✨" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar la aplicacion en modo desarrollo, simplemente ejecuta:"
Write-Host "👉 npm run tauri dev" -ForegroundColor Cyan
Write-Host ""
