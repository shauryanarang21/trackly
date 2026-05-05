@echo off
set NODE_DIR=C:\Users\Shaurya Narang\AppData\Local\Zed\node\node-v24.11.0-win-x64
set PATH=%NODE_DIR%;%PATH%
cd /d "%~dp0backend"
npm run dev
pause
