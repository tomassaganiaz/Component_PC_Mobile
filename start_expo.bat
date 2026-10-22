@echo off
cd C:\Users\tomiz\Downloads\Component_PC_Celu\Frontend
set EXPO_PACKAGER_PROXY_URL=http://10.0.2.2:8081
set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
set CI=1
npx expo start --port 8081