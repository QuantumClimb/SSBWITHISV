@echo off
setlocal enabledelayedexpansion

:: Change to the directory where the script is located
cd /d "%~dp0"

echo ========================================
echo SSB VIRTUAL TRAINING XPERIENCE - Build
echo ========================================
echo.

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [!] node_modules not found. Running npm install first...
    call npm install
    echo.
)

echo [1/2] Initializing Production Build...
echo.

:: Run the build command
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [X] Build FAILED! Please check the errors above.
    echo ========================================
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Build Completed Successfully! 
echo.
echo Output directory: \dist
echo.
echo ========================================
pause
