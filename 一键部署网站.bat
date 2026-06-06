@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo SC Doudizhu Website - Build and Deploy
echo ========================================
echo.

echo [1/5] Validate canonical data...
python tools\validate_data.py
if errorlevel 1 goto failed

echo.
echo [2/5] Build public data...
python tools\build_site_data.py
if errorlevel 1 goto failed

echo.
echo [3/5] Build static website...
npm run build
if errorlevel 1 goto failed

echo.
echo [4/5] Commit changes if needed...
git add .
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Update website data and content"
  if errorlevel 1 goto failed
) else (
  echo No file changes to commit.
)

echo.
echo [5/5] Push to GitHub...
git push
if errorlevel 1 goto failed

echo.
echo SUCCESS: Website changes have been pushed. GitHub Pages will deploy automatically.
echo You can visit https://scdoudizhu.com after the GitHub Actions workflow finishes.
echo.
pause
exit /b 0

:failed
echo.
echo FAILED: Please read the error message above.
echo.
pause
exit /b 1
