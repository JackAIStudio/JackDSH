@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================================
echo          Jack DSH「三剑客」Profile 快速恢复工具
echo ========================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "INPUT_FILE=%~1"

if "%INPUT_FILE%"=="" (
    if exist "%SCRIPT_DIR%jack-profile.enc" (
        set "INPUT_FILE=%SCRIPT_DIR%jack-profile.enc"
    ) else if exist "%SCRIPT_DIR%..\..\jack-profile.enc" (
        set "INPUT_FILE=%SCRIPT_DIR%..\..\jack-profile.enc"
    )
)

:: 寻找可用的 Node 运行时（系统 Node 或 JackDSH 自带运行时）
set "NODE_CMD="
where node >nul 2>nul
if %errorlevel% equ 0 (
    set "NODE_CMD=node"
) else (
    if exist "%SCRIPT_DIR%..\..\JackDSH.exe" (
        set "NODE_CMD=%SCRIPT_DIR%..\..\JackDSH.exe"
        set "ELECTRON_RUN_AS_NODE=1"
    ) else if exist "%SCRIPT_DIR%JackDSH.exe" (
        set "NODE_CMD=%SCRIPT_DIR%JackDSH.exe"
        set "ELECTRON_RUN_AS_NODE=1"
    )
)

if "%NODE_CMD%"=="" (
    echo [错误] 未检测到可用的 Node.js 运行时。
    echo 请确认已安装 Node.js 或将本脚本置于 JackDSH 应用程序目录下。
    pause
    exit /b 1
)

if "%INPUT_FILE%"=="" (
    "%NODE_CMD%" "%SCRIPT_DIR%import.mjs"
) else (
    "%NODE_CMD%" "%SCRIPT_DIR%import.mjs" -i "%INPUT_FILE%"
)

echo.
pause
