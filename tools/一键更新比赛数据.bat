@echo off
setlocal
cd /d "%~dp0\.."

echo ========================================
echo SC Doudizhu Site - Data Update
echo ========================================
echo.

python tools\import_parser_zip.py
if errorlevel 1 goto failed

python tools\validate_data.py
if errorlevel 1 goto failed

python tools\build_site_data.py
if errorlevel 1 goto failed

npm run build
if errorlevel 1 goto failed

echo.
echo SUCCESS: data and site build finished.
echo.
pause
exit /b 0

:failed
echo.
echo FAILED. Please read the error above.
echo.
pause
exit /b 1
