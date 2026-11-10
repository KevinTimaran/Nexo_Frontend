# Nexo Desktop

Aplicación React + TypeScript con Vite, empaquetada como aplicación de escritorio con Tauri. El backend usa Spring Boot y Java 21.

## Ejecutar en Windows

Abre dos terminales de PowerShell desde la carpeta raíz `AppPc`.

### Terminal 1: backend

```powershell
cd .\back\Nexo_Backend\nexo-api
.\mvnw.cmd spring-boot:run
```

El API queda disponible en `http://localhost:8080`. Su estado se puede comprobar en `http://localhost:8080/api/v1/health`.

### Terminal 2: frontend web

```powershell
cd .\Fromt\Nexo_Frontend\nexo-desktop
npm ci
npm run dev
```

Vite muestra en la terminal la dirección local, normalmente `http://localhost:1420`.

### Aplicación de escritorio Tauri

Con el backend ejecutándose:

```powershell
cd .\Fromt\Nexo_Frontend\nexo-desktop
npm run tauri dev
```

## Verificación

```powershell
# Frontend
npm run build
npm test

# Backend
cd ..\..\..\back\Nexo_Backend\nexo-api
.\mvnw.cmd test
```

## Herramientas necesarias

- Node.js LTS y npm
- Java 21
- Rust estable y Cargo
- Visual Studio Build Tools 2022 con las herramientas de C++
- Microsoft Edge WebView2
- Git

Al instalar herramientas o modificar el `PATH`, cierra y vuelve a abrir PowerShell para cargar las variables nuevas.