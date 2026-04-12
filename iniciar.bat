@echo off
:: Garante execucao como Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Sistema Consultorio - Inicializando...
color 0A

echo ============================================================
echo     SISTEMA CONSULTORIO - INICIANDO SERVICOS
echo ============================================================
echo.

:: ─── 0. GIT PULL (atualiza antes de subir) ───────────────────
echo [0/6] Verificando atualizacoes no repositorio...
cd /d C:\consultorio
git fetch origin >nul 2>&1

for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f %%i in ('git rev-parse @{u}') do set REMOTE=%%i

if "%LOCAL%"=="%REMOTE%" (
    echo       OK - Ja esta na versao mais recente.
) else (
    echo       NOVIDADE encontrada! Aplicando atualizacoes...
    git pull origin
    echo       OK - Repositorio atualizado.
)
echo.

:: ─── 1. SQL SERVER BROWSER (necessario para \SQLEXPRESS) ─────
echo [1/6] Iniciando SQL Server Browser...
sc config SQLBrowser start= auto >nul 2>&1
net start SQLBrowser >nul 2>&1
if %errorlevel%==0 (
    echo       OK - SQL Server Browser iniciado.
) else (
    echo       OK - SQL Server Browser ja estava em execucao.
)
echo.

:: ─── 2. SQL SERVER EXPRESS ───────────────────────────────────
echo [2/6] Iniciando SQL Server Express...
net start MSSQL$SQLEXPRESS >nul 2>&1
if %errorlevel%==0 (
    echo       OK - SQL Server iniciado.
) else (
    echo       OK - SQL Server ja estava em execucao.
)
echo.

:: ─── 3. BACKEND (ASP.NET Core) ───────────────────────────────
echo [3/6] Iniciando Backend (porta 5205)...
start "BACKEND - Consultorio API" cmd /k "cd /d C:\consultorio\backend && dotnet run --project Consultorio.API --launch-profile http"
timeout /t 5 /nobreak >nul
echo       OK - Janela do backend aberta.
echo.

:: ─── 4. FRONTEND (React + Vite) ──────────────────────────────
echo [4/6] Iniciando Frontend (porta 5173)...
start "FRONTEND - Consultorio" cmd /k "cd /d C:\consultorio\frontend && npm install && npm run dev"
timeout /t 3 /nobreak >nul
echo       OK - Janela do frontend aberta.
echo.

:: ─── 5. CLOUDFLARE TUNNEL ────────────────────────────────────
echo [5/6] Iniciando Cloudflare Tunnel...
set CLOUDFLARED=C:\Users\Ludimila\AppData\Local\Microsoft\WinGet\Links\cloudflared.exe
start "CLOUDFLARE - Tunnel" cmd /k ""%CLOUDFLARED%" tunnel run consultorio"
timeout /t 2 /nobreak >nul
echo       OK - Janela do Cloudflare aberta.
echo.

:: ─── 6. MONITOR DE ATUALIZACOES (a cada 5 minutos) ───────────
echo [6/6] Iniciando Monitor de Atualizacoes (5 min)...
start "MONITOR - Consultorio" cmd /k "C:\consultorio\monitor.bat"
echo       OK - Monitor ativo em janela separada.
echo.

echo ============================================================
echo     TODOS OS SERVICOS FORAM INICIADOS!
echo ============================================================
echo.
echo   Backend local:   http://localhost:5205
echo   Frontend local:  http://localhost:5173
echo.
echo   Online (publico):
echo   Site:  https://psicologiaeexistir.com.br
echo   API:   https://api.psicologiaeexistir.com.br
echo   Front: https://front.psicologiaeexistir.com.br
echo.
echo   Janelas abertas:
echo   - BACKEND          (dotnet run)
echo   - FRONTEND         (vite dev)
echo   - CLOUDFLARE       (tunnel)
echo   - MONITOR          (git watcher - 5 min)
echo ============================================================
echo.
pause
