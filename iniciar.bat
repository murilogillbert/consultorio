@echo off
setlocal EnableExtensions EnableDelayedExpansion

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permissao de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Sistema Consultorio - Inicializando...
color 0A

set "DOCKER_DB_CONTAINER=consultorio_sqlserver"
set "DOTNET_CONNECTION=Server=localhost,1433;Database=Consultorio;User Id=sa;Password=Consultorio@2026;TrustServerCertificate=True;Encrypt=False;"
set "CLOUDFLARED=C:\Users\Ludimila\AppData\Local\Microsoft\WinGet\Links\cloudflared.exe"
set "CF_CONFIG=C:\consultorio\cloudflared-config.yml"

echo ============================================================
echo     SISTEMA CONSULTORIO - INICIANDO SERVICOS
echo ============================================================
echo.

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

echo [1/6] Verificando SQL Server no Docker...
docker inspect -f "{{.State.Running}}" %DOCKER_DB_CONTAINER% >nul 2>&1
if %errorlevel% neq 0 (
    echo       ERRO - Container %DOCKER_DB_CONTAINER% nao encontrado.
    echo       Verifique o Docker Desktop e o container do banco antes de continuar.
    pause
    exit /b 1
)

for /f %%i in ('docker inspect -f "{{.State.Running}}" %DOCKER_DB_CONTAINER%') do set DB_RUNNING=%%i
if /I "!DB_RUNNING!"=="true" (
    echo       OK - Container %DOCKER_DB_CONTAINER% ja esta em execucao.
) else (
    echo       Iniciando container %DOCKER_DB_CONTAINER%...
    docker start %DOCKER_DB_CONTAINER% >nul 2>&1
    if %errorlevel%==0 (
        echo       OK - SQL Server Docker iniciado.
    ) else (
        echo       ERRO - Nao foi possivel iniciar o container %DOCKER_DB_CONTAINER%.
        pause
        exit /b 1
    )
)
echo.

echo [2/6] Aguardando SQL Server responder na porta 1433...
powershell -Command "$deadline=(Get-Date).AddSeconds(45); do { $ok = Test-NetConnection -ComputerName 'localhost' -Port 1433 -WarningAction SilentlyContinue; if($ok.TcpTestSucceeded){ exit 0 }; Start-Sleep -Seconds 2 } while((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if %errorlevel%==0 (
    echo       OK - SQL Server disponivel em localhost:1433.
) else (
    echo       ERRO - SQL Server no Docker nao respondeu dentro do tempo esperado.
    pause
    exit /b 1
)
echo.

echo [3/6] Iniciando Backend (porta 5205)...
start "BACKEND - Consultorio API" cmd /k "set ConnectionStrings__DefaultConnection=%DOTNET_CONNECTION% && cd /d C:\consultorio\backend\Consultorio.API && dotnet run --launch-profile http"
timeout /t 5 /nobreak >nul
echo       OK - Janela do backend aberta.
echo.

echo [4/6] Preparando Frontend de producao (porta 5173)...
if exist "C:\consultorio\frontend\node_modules" (
    start "FRONTEND - Consultorio" cmd /k "cd /d C:\consultorio\frontend && npm run build && npm run preview -- --host 0.0.0.0 --port 5173"
) else (
    start "FRONTEND - Consultorio" cmd /k "cd /d C:\consultorio\frontend && npm install && npm run build && npm run preview -- --host 0.0.0.0 --port 5173"
)
echo       Aguardando frontend responder em 127.0.0.1:5173...
powershell -Command "$deadline=(Get-Date).AddSeconds(90); do { try { $ok = Test-NetConnection -ComputerName '127.0.0.1' -Port 5173 -WarningAction SilentlyContinue; if($ok.TcpTestSucceeded){ exit 0 } } catch {}; Start-Sleep -Seconds 2 } while((Get-Date) -lt $deadline); exit 1" >nul 2>&1
if %errorlevel%==0 (
    echo       OK - Frontend de producao disponivel em 127.0.0.1:5173.
) else (
    echo       ERRO - Frontend nao respondeu em 127.0.0.1:5173 dentro do tempo esperado.
    echo       Verifique a janela FRONTEND para erro de build ou de execucao.
    pause
    exit /b 1
)
echo.

echo [5/6] Iniciando Cloudflare Tunnel...
start "CLOUDFLARE - Tunnel" cmd /k ""%CLOUDFLARED%" --config "%CF_CONFIG%" tunnel run consultorio"
timeout /t 2 /nobreak >nul
echo       OK - Janela do Cloudflare aberta.
echo.

echo [6/6] Iniciando Monitor de Atualizacoes (5 min)...
start "MONITOR - Consultorio" cmd /k "C:\consultorio\monitor.bat"
echo       OK - Monitor ativo em janela separada.
echo.

echo ============================================================
echo     TODOS OS SERVICOS FORAM INICIADOS!
echo ============================================================
echo.
echo   Banco local:     SQL Server Docker em localhost:1433 / Consultorio
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
echo   - FRONTEND         (vite preview com build de producao)
echo   - CLOUDFLARE       (tunnel)
echo   - MONITOR          (git watcher - 5 min)
echo ============================================================
echo.
pause
