@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules" (
  echo Primera vez: instalando dependencias, puede tardar un par de minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: no se pudo instalar. Revisa que tengas Node.js instalado.
    pause
    exit /b 1
  )
)

echo Arrancando el servidor local...
start "PARA PARAR: cierra esta ventana con la X" cmd /k "echo. & echo ================================================ & echo   PARA PARAR EL SERVIDOR: cierra esta ventana & echo   (la X arriba a la derecha). Eso es todo. & echo ================================================ & echo. & npm run dev"

echo Esperando a que arranque...
timeout /t 4 /nobreak >nul

start "" "http://localhost:5173/"
start "" "http://localhost:5173/editor.html"

echo.
echo Listo. Se han abierto dos pestanas del navegador:
echo   - http://localhost:5173/            (la app)
echo   - http://localhost:5173/editor.html (el editor de fichas)
echo.
echo Esta ventana se cierra sola. Para PARAR el servidor, cierra la otra
echo ventana: "Servidor local - app-studio (no cerrar mientras trabajas)".
timeout /t 4 /nobreak >nul
exit
