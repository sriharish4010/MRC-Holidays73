@echo off
REM 🚀 Vehicle Rental System - Supabase Quick Start (Windows)
REM Placement-Level Project Setup

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   🎯 Vehicle Rental System - Supabase Edition               ║
echo ║   ✨ Placement-Level Production Ready                      ║
echo ║   🔧 Real-time Updates ^| PostgreSQL ^| Redis Cache            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
echo 📍 Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo ✅ Node.js !NODE_VERSION! found
) else (
    echo ❌ Node.js not found
    echo    Install from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check npm
echo 📍 Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm installed
) else (
    echo ❌ npm not found
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo 📍 Installing dependencies...
call npm install
if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully
) else (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Check .env
echo.
echo 📍 Checking environment variables...
if exist ".env" (
    echo ✅ .env file found
    echo.
    echo   Configuration:
    for /f "tokens=*" %%i in ('type .env ^| findstr "SUPABASE"') do (
        echo   %%i
    )
) else (
    echo ❌ .env file not found
    echo    Creating .env template...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo.
        echo # Supabase Configuration
        echo SUPABASE_URL=https://czocnfvusoybakoohwzm.supabase.co
        echo SUPABASE_ANON_KEY=your-anon-key
        echo SUPABASE_SERVICE_KEY=your-service-key
        echo.
        echo # Redis Configuration
        echo REDIS_URL=your-redis-url
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-jwt-secret
        echo JWT_EXPIRATION=24h
    ) > .env
    echo ✅ .env template created - please update with your credentials
)

echo.
echo 🎯 Next Steps:
echo.
echo 1️⃣  Database Setup:
echo    - Open https://app.supabase.com
echo    - Go to SQL Editor
echo    - Create new query
echo    - Copy contents of: supabase-schema.sql
echo    - Execute the SQL
echo.
echo 2️⃣  Start Backend Server:
echo    - Open Terminal/PowerShell
echo    - Run: npm run server:dev
echo    - Backend will start on http://localhost:5000
echo.
echo 3️⃣  Start Frontend Server:
echo    - Open New Terminal/PowerShell
echo    - Run: npm run dev
echo    - Frontend will start on http://localhost:5173
echo.
echo 4️⃣  Test the Application:
echo    - Open http://localhost:5173
echo    - Try user-login.html
echo    - Test admin-dashboard.html
echo.

echo 📚 Documentation Files:
echo    - SUPABASE_SETUP.md ........... Complete setup guide
echo    - BACKEND_README.md ........... API documentation
echo    - SYSTEM_OVERVIEW.md ......... System architecture
echo    - FLOW_DIAGRAMS.md ........... Architecture diagrams
echo.

echo ✅ Setup complete! 
echo.
pause
