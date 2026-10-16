# LevantarTodo.ps1 — levanta Backend + túneles Cloudflare + Expo con QR, en orden.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\LevantarTodo.ps1
#
# Hace, en orden y solo lo que falte:
#   1. Backend (NestJS) en http://localhost:3000 si el puerto está libre.
#   2. Dos túneles cloudflared desacoplados (Metro 8081 y API 3000). Reutiliza
#      los existentes si responden; si no, los recrea (las URLs cambian).
#   3. Expo/Metro con EXPO_PACKAGER_PROXY_URL y EXPO_PUBLIC_API_URL apuntando
#      a los túneles vigentes (reinicia Metro solo si cambió la URL o no corría).
#      No requiere cuenta de ngrok: usa cloudflared Quick Tunnel (trycloudflare).
#   4. Verifica los 4 extremos y descarga el QR a $env:TEMP\opencode\expo-qr.png.
#
# Logs: backend_dev.out.log / frontend_dev.out.log (raíz del repo).
# El binario cloudflared vive en $env:TEMP\opencode (no se commitea).

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'Frontend'
$ToolsDir = Join-Path $env:TEMP 'opencode'
$Cloudflared = Join-Path $ToolsDir 'cloudflared.exe'
$MetroLog = Join-Path $ToolsDir 'tunnel-metro.log'
$ApiLog = Join-Path $ToolsDir 'tunnel-api.log'
$QrPath = Join-Path $ToolsDir 'expo-qr.png'

function PortOpen($Port) {
  return ($null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1))
}

function WaitForUrl($LogPath, $TimeoutSec = 75) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    if (Test-Path -LiteralPath $LogPath) {
      $m = Select-String -Path $LogPath -Pattern 'https://[a-zA-Z0-9.-]*trycloudflare.com' -ErrorAction SilentlyContinue |
        ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | Select-Object -Last 1
      if ($m) { return $m }
    }
    Start-Sleep -Seconds 3
  }
  throw "Timeout esperando URL de túnel en $LogPath"
}

function HttpOk($Url) {
  try {
    # GET y no HEAD: Metro /status no garantiza HEAD.
    $r = Invoke-WebRequest -Uri $Url -TimeoutSec 20 -UseBasicParsing
    return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400)
  } catch { return $false }
}

# 0. cloudflared disponible
if (-not (Test-Path -LiteralPath $Cloudflared)) {
  Write-Output 'Descargando cloudflared (una sola vez)...'
  New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
  Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile $Cloudflared
}

# 1. Backend
if (PortOpen 3000) {
  Write-Output 'Backend: ya corre en :3000.'
} else {
  Write-Output 'Backend: iniciando (npm run start:dev)...'
  Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile','-Command','npm run start:dev' `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput (Join-Path $Root 'backend_dev.out.log') `
    -RedirectStandardError (Join-Path $Root 'backend_dev.err.log')
}

# 1b. Esperar al backend (cold start de Nest + seeds tarda 1-2 min).
$sw = [Diagnostics.Stopwatch]::StartNew()
while (-not (PortOpen 3000) -and $sw.Elapsed.TotalSeconds -lt 240) { Start-Sleep -Seconds 5 }
if (-not (PortOpen 3000)) { throw 'Backend no levantó en :3000 (ver backend_dev.out.log / backend_dev.err.log)' }
Write-Output 'Backend: responde en :3000.'

# 2. Túneles (reutilizar si responden, recrear si no)
$metroUrl = $null; $apiUrl = $null
if ((Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue)) {
  if (Test-Path -LiteralPath $MetroLog) {
    $metroUrl = Select-String -Path $MetroLog -Pattern 'https://[a-zA-Z0-9.-]*trycloudflare.com' -ErrorAction SilentlyContinue |
      ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | Select-Object -Last 1
  }
  if (Test-Path -LiteralPath $ApiLog) {
    $apiUrl = Select-String -Path $ApiLog -Pattern 'https://[a-zA-Z0-9.-]*trycloudflare.com' -ErrorAction SilentlyContinue |
      ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | Select-Object -Last 1
  }
}
$metroOk = $metroUrl -and (HttpOk "$metroUrl/status")
$apiOk = $apiUrl -and (HttpOk "$apiUrl/api/docs")
if ($metroOk -and $apiOk) {
  Write-Output "Túneles: reutilizando existentes."
  Write-Output "  Metro: $metroUrl"
  Write-Output "  API:   $apiUrl"
} else {
  Write-Output 'Túneles: (re)creando...'
  Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item (Join-Path $ToolsDir 'tunnel-*.log') -ErrorAction SilentlyContinue
  $a1 = @{CommandLine = "cmd /c `"`"$Cloudflared`" tunnel --url http://localhost:8081 >> `"$MetroLog`" 2>&1`""}
  $a2 = @{CommandLine = "cmd /c `"`"$Cloudflared`" tunnel --url http://localhost:3000 >> `"$ApiLog`" 2>&1`""}
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments $a1 | Out-Null
  Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments $a2 | Out-Null
  $metroUrl = WaitForUrl $MetroLog
  $apiUrl = WaitForUrl $ApiLog
  Write-Output "  Metro: $metroUrl"
  Write-Output "  API:   $apiUrl"
}

# 3. Expo con las URLs vigentes
$expoEnvFile = Join-Path $ToolsDir 'expo-env.txt'
$expoEnv = @()
if (Test-Path -LiteralPath $expoEnvFile) { $expoEnv = @(Get-Content -LiteralPath $expoEnvFile) }
$expoVigente = (PortOpen 8081) -and ($expoEnv.Count -ge 2) -and ($expoEnv[0] -eq $metroUrl) -and ($expoEnv[1] -eq $apiUrl)
if ($expoVigente) {
  Write-Output 'Expo: ya corre con los túneles vigentes.'
} else {
  Write-Output 'Expo: (re)lanzando con URLs vigentes...'
  $m = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($m) { Stop-Process -Id $m.OwningProcess -Force }
  Start-Sleep -Seconds 3
  Start-Process -FilePath 'powershell' -ArgumentList '-NoProfile','-Command',
    "`$env:EXPO_PACKAGER_PROXY_URL='$metroUrl'; `$env:EXPO_PUBLIC_API_URL='$apiUrl/api'; `$env:CI='1'; npx expo start --port 8081" `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput (Join-Path $Root 'frontend_dev.out.log') `
    -RedirectStandardError (Join-Path $Root 'frontend_dev.err.log')
  $sw = [Diagnostics.Stopwatch]::StartNew()
  while (-not (PortOpen 8081) -and $sw.Elapsed.TotalSeconds -lt 120) { Start-Sleep -Seconds 5 }
  if (-not (PortOpen 8081)) { throw 'Metro no levantó en :8081' }
  @($metroUrl, $apiUrl) | Set-Content -LiteralPath $expoEnvFile
  Write-Output 'Expo: Metro en :8081.'
}

# 4. Verificación final + QR
Start-Sleep -Seconds 10
$checks = @(
  @('Backend local', 'http://localhost:3000/api/docs'),
  @('Metro túnel', "$metroUrl/status"),
  @('API túnel', "$apiUrl/api/docs")
)
$allOk = $true
foreach ($c in $checks) {
  $ok = $false
  # Reintentos: el borde de Cloudflare tarda unos segundos en registrar el túnel.
  for ($i = 0; $i -lt 6 -and -not $ok; $i++) {
    if ($i -gt 0) { Start-Sleep -Seconds 10 }
    $ok = HttpOk $c[1]
  }
  if (-not $ok) { $allOk = $false }
  Write-Output ("  [{0}] {1}" -f ($(if ($ok) { 'OK' } else { 'FALLO' }), $c[0]))
}
$expUrl = "exp://$($metroUrl -replace '^https?://','')"
Write-Output ''
Write-Output "Abrí en Expo Go: $expUrl"
try {
  # QR ASCII en consola (best-effort, usa qrcode-terminal del Frontend si está instalado)
  Push-Location -LiteralPath $FrontendDir
  node -e "try{require('qrcode-terminal').generate(process.argv[1],{small:true})}catch(e){}" "$expUrl"
  Pop-Location
} catch { }
try {
  Invoke-WebRequest -Uri ("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + [Uri]::EscapeDataString($expUrl)) -OutFile $QrPath
  Write-Output "QR guardado en: $QrPath"
} catch {
  Write-Output 'No se pudo descargar el QR (sin internet saliente); usá la URL de arriba.'
}
if (-not $allOk) { throw 'Alguna verificación falló; revisar logs.' }
Write-Output 'TODO LEVANTADO ✔'
