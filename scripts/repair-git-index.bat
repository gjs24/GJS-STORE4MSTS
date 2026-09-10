@echo off
echo ===================================================
echo   Repairing Git Index for MSTS-GJS Production Store
echo ===================================================

cd /d "%~dp0\.."

if exist .git\index.lock (
    echo Removing stale .git\index.lock...
    del /f /q .git\index.lock
)

if exist .git\index (
    echo Removing corrupted .git\index...
    del /f /q .git\index
)

echo Rebuilding index from current HEAD...
git reset

echo.
echo Checking Git status...
git status

echo.
echo ===================================================
echo   Git index repaired successfully!
echo ===================================================
pause
