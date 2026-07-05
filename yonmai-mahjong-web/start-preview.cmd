@echo off
cd /d "%~dp0"
echo Building Yonmai Mahjong Web...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo Starting production preview at http://127.0.0.1:4173/
echo Keep this window open while playing.
call npm.cmd run preview
pause
