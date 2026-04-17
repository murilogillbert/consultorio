@echo off
setlocal EnableExtensions EnableDelayedExpansion

title MONITOR - Consultorio (Git Watcher)
color 0B

set "DOCKER_DB_CONTAINER=consultorio_sqlserver"
set "DOTNET_CONNECTION=Server=localhost,1433;Database=Consultorio;User Id=sa;Password=Consultorio@2026;TrustServerCertificate=True;Encrypt=False;"

echo ============================================================
echo   MONITOR DE ATUALIZACOES - Consultorio
echo   Verificando o repositorio a cada 5 minutos...
echo ============================================================
echo.

:LOOP
    for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set DATA=%%a/%%b/%%c
    for /f "tokens=1-2 delims=: " %%a in ("%time%") do set HORA=%%a:%%b

    echo [%DATA% %HORA%] Verificando atualizacoes...

    cd /d C:\consultorio
    git fetch origin >nul 2>&1

    for /f %%i in ('git rev-parse HEAD') do set LOCAL=%%i
    for /f %%i in ('git rev-parse @{u}') do set REMOTE=%%i

    if "%LOCAL%"=="%REMOTE%" (
        echo [%DATA% %HORA%] Sem novidades. Proxima verificacao em 5 minutos.
        echo.
    ) else (
        echo.
        echo ************************************************************
        echo   NOVIDADE DETECTADA! Reiniciando servicos...
        echo ************************************************************
        echo.

        echo [1/4] Aplicando git pull...
        git pull origin
        echo.

        echo [2/4] Encerrando servicos em execucao...
        taskkill /FI "WINDOWTITLE eq BACKEND - Consultorio API*" /F >nul 2>&1
        taskkill /FI "WINDOWTITLE eq FRONTEND - Consultorio*" /F >nul 2>&1
        taskkill /FI "WINDOWTITLE eq CLOUDFLARE - Tunnel*" /F >nul 2>&1
        timeout /t 3 /nobreak >nul
        echo       OK - Servicos encerrados.
        echo.

        echo [3/4] Verificando SQL Server Docker (DB Consultorio)...
        for /f %%i in ('docker inspect -f "{{.State.Running}}" %DOCKER_DB_CONTAINER% 2^>nul') do set DB_RUNNING=%%i
        if /I not "!DB_RUNNING!"=="true" (
            docker start %DOCKER_DB_CONTAINER% >nul 2>&1
            timeout /t 3 /nobreak >nul
        )

        echo [3/4] Reiniciando Backend...
        start "BACKEND - Consultorio API" cmd /k "set ConnectionStrings__DefaultConnection=%DOTNET_CONNECTION% && cd /d C:\consultorio\backend\Consultorio.API && dotnet run --launch-profile http"
        timeout /t 5 /nobreak >nul

        echo [3/4] Reiniciando Frontend...
        start "FRONTEND - Consultorio" cmd /k "cd /d C:\consultorio\frontend && npm run dev"
        timeout /t 3 /nobreak >nul

        echo [4/4] Reiniciando Cloudflare Tunnel...
        start "CLOUDFLARE - Tunnel" cmd /k "cloudflared tunnel run consultorio_oficial"
        timeout /t 2 /nobreak >nul

        echo.
        echo ************************************************************
        echo   Servicos reiniciados com sucesso!
        echo ************************************************************
        echo.
    )

    timeout /t 300 /nobreak >nul

goto LOOP
