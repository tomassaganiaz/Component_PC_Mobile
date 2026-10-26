@echo off
cd C:\Users\tomiz\Downloads\Component_PC_Celu\backend
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "npm run start:dev"
cd ..\frontend\
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "npx expo start"