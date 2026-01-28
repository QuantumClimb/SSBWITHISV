@echo off
cd /d "k:\I DRIVE\SSBWISV"

echo ================================
echo Git Push Automation
echo ================================
echo.

echo Adding all files...
git add .
echo.

set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update project files

echo.
echo Committing with message: %commit_msg%
git commit -m "%commit_msg%"
echo.

echo Pushing to GitHub...
git push origin master
echo.

echo ================================
echo Push completed successfully!
echo ================================
pause
