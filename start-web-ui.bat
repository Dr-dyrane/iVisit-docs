@echo off
echo Starting iVisit Document Generator Web UI...
echo.
cd web-ui
echo Installing dependencies if needed...
call npm install
echo.
echo Starting Development Server...
npm run dev
pause
