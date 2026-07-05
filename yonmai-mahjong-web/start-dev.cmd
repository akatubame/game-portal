@echo off
cd /d "%~dp0"
echo Starting Yonmai Mahjong Web at http://127.0.0.1:4173/
echo Keep this window open while playing.
call npm.cmd run dev
pause
