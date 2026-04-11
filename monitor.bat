@echo off
title MONITOR - Consultorio (Git Watcher)
color 0B

echo ============================================================
echo   MONITOR DE ATUALIZACOES - Consultorio
echo   Verificando o repositorio a cada 5 minutos...
echo ============================================================
echo.

:LOOP
    :: Timestamp da verificacao
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

        :: ─── Aplicar atualizacoes ───────────────────────────────────
        echo [1/4] Aplicando git pull...
        git pull origin
        echo.

        :: ─── Encerrar servicos atuais ───────────────────────────────
        echo [2/4] Encerrando servicos em execucao...
        taskkill /FI "WINDOWTITLE eq BACKEND - Consultorio API*" /F >nul 2>&1
        taskkill /FI "WINDOWTITLE eq FRONTEND - Consultorio*"    /F >nul 2>&1
        taskkill /FI "WINDOWTITLE eq CLOUDFLARE - Tunnel*"       /F >nul 2>&1
        timeout /t 3 /nobreak >nul
        echo       OK - Servicos encerrados.
        echo.

        :: ─── Reiniciar servicos ─────────────────────────────────────
        echo [3/4] Reiniciando Backend...
        start "BACKEND - Consultorio API" cmd /k "cd /d C:\consultorio\backend && dotnet run --project Consultorio.API --launch-profile http"
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

    :: Aguarda 5 minutos (300 segundos) antes da proxima verificacao
    timeout /t 300 /nobreak >nul

goto LOOP
