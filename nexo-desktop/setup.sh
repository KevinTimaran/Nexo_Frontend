#!/bin/bash
set -e

echo "=================================================="
echo "🚀 INICIANDO CONFIGURACIÓN DE NEXO DESKTOP"
echo "=================================================="
echo ""

# 1. Verificar dependencias básicas
if ! command -v npm &> /dev/null; then
    echo "❌ ERROR: Node.js/npm no están instalados."
    echo "Por favor, instala Node.js primero desde: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js / npm detectado."

# 2. Instalar Rust si no existe
if ! command -v cargo &> /dev/null; then
    echo "⚙️ Instalando Rust y Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
    echo "✅ Rust instalado correctamente."
else
    echo "✅ Rust detectado."
fi

# 3. Instalar dependencias nativas para Tauri (Solo Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detectado entorno Linux. Instalando dependencias de Tauri..."
    if command -v apt-get &> /dev/null; then
        echo "Ejecutando sudo apt install..."
        sudo apt update
        sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
    elif command -v pacman &> /dev/null; then
        sudo pacman -Syu --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module gtk3 libappindicator-gtk3 librsvg libvips
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y webkit2gtk4.1-devel curl wget file openssl-devel pango-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
    else
        echo "⚠️ No se detectó apt, pacman ni dnf. Asegúrate de instalar dependencias de Tauri manualmente."
    fi
fi

# 4. Instalar dependencias del proyecto (Node modules)
echo ""
echo "📦 Instalando dependencias del proyecto (npm install)..."
npm install

echo ""
echo "=================================================="
echo "✨ ¡ENTORNO CONFIGURADO CON ÉXITO! ✨"
echo "=================================================="
echo ""
echo "Para iniciar la aplicación en modo desarrollo, simplemente ejecuta:"
echo "👉 npm run tauri dev"
echo ""
