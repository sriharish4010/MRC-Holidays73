@echo off
REM Vehicle Rental System - Quick Start Script (Windows)
REM This script helps you set up and run the entire system

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  Vehicle Rental System - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
where /q node
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js found
    node --version
)

REM Check if npm is installed
where /q npm
if errorlevel 1 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
) else (
    echo [OK] npm found
    npm --version
)

REM Check if MySQL is installed
where /q mysql
if errorlevel 1 (
    echo [WARNING] MySQL not found in PATH.
    echo Please ensure MySQL is installed and you can access it via command line.
    echo Or use MySQL Workbench to run database_schema.sql
) else (
    echo [OK] MySQL found
    mysql --version
)

REM Check if Redis is running
echo.
echo Checking Redis connection...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Redis not accessible. Please start Redis server:
    echo   - Run: redis-server
    echo   - Or download from: https://github.com/microsoftarchive/redis/releases
) else (
    echo [OK] Redis is running
)

echo.
echo ========================================
echo  Installing Dependencies
echo ========================================
echo.

call npm install
if errorlevel 1 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup Instructions
echo ========================================
echo.
echo 1. DATABASE SETUP:
echo    - Run: mysql -u root -p ^< database_schema.sql
echo    - Or import database_schema.sql in MySQL Workbench
echo    - This will create the 'vehicle_rental' database
echo.
echo 2. ENVIRONMENT CONFIGURATION:
echo    - Edit .env file with your settings:
echo      * DB_PASSWORD: Your MySQL password
echo      * REDIS_HOST: Redis server address
echo      * JWT_SECRET: Keep it secret!
echo.
echo 3. START BACKEND SERVER:
echo    - Run: npm run dev
echo    - Server will run on http://localhost:5000
echo.
echo 4. START FRONTEND:
echo    - In another terminal, run: npm run dev
echo    - Frontend will run on http://localhost:5173
echo.
echo 5. ACCESS THE SYSTEM:
echo    Admin:  http://localhost:5173/admin-login.html
echo    User:   http://localhost:5173/user-login.html
echo.
echo Default Credentials:
echo    Admin: admin / password123
echo    OTP:   123456
echo.
echo ========================================
echo  Database Setup
echo ========================================
echo.

REM Ask if user wants to setup database
set /p dbsetup="Do you want to setup the database now? (y/n): "
if /i "!dbsetup!"=="y" (
    set /p dbpass="Enter MySQL root password: "
    mysql -u root -p!dbpass! < database_schema.sql
    if errorlevel 1 (
        echo [ERROR] Database setup failed
    ) else (
        echo [OK] Database setup completed
    )
)

echo.
echo ========================================
echo  Ready to Start!
echo ========================================
echo.
echo Next steps:
echo.
echo Terminal 1 - Start Backend:
echo   npm run dev
echo.
echo Terminal 2 - Start Frontend:
echo   npm run dev
echo.
echo Then open your browser:
echo   http://localhost:5173
echo.
pause
