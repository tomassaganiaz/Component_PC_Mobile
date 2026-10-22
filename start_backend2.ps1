param($Dir = "C:\Users\tomiz\Downloads\Component_PC_Celu\backend")

Write-Output "Iniciando Backend en $Dir..."
Push-Location -LiteralPath $Dir
& npm run start:dev
Pop-Location