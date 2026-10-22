@echo off
cd C:\Users\tomiz\Downloads\Component_PC_Celu\Frontend
set EXPO_PACKAGER_PROXY_URL=http://localhost:8081
set EXPO_PUBLIC_API_URL=http://localhost:3000/api
set CI=1
npx expo start --port 8081