$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
$localDir = Join-Path $root '.local'
$python = Join-Path $root '.venv\Scripts\python.exe'
$vite = Join-Path $frontend 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $python)) { throw 'Missing .venv. Run python -m venv .venv --system-site-packages from this folder.' }
if (-not (Test-Path -LiteralPath $vite)) { throw 'Missing frontend dependencies. Run npm ci --offline in frontend.' }
foreach ($port in 8000, 8001, 5173) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port ${port} is already in use. No new service was started."
    }
}
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
if ($env:HYPERION_DATABASE_PATH) {
    $resolvedDb = [System.IO.Path]::GetFullPath($env:HYPERION_DATABASE_PATH)
    if (-not $resolvedDb.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'HYPERION_DATABASE_PATH must stay inside HYPERION-Networking for this local startup.'
    }
} else {
    $env:HYPERION_DATABASE_PATH = Join-Path $localDir 'networking-demo.db'
}
$secretFile = Join-Path $localDir 'gateway-admin-secret.txt'
if (-not $env:HYPERION_GATEWAY_ADMIN_SECRET) {
    if (Test-Path -LiteralPath $secretFile) {
        $env:HYPERION_GATEWAY_ADMIN_SECRET = (Get-Content -LiteralPath $secretFile -Raw).Trim()
    } else {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $env:HYPERION_GATEWAY_ADMIN_SECRET = [System.BitConverter]::ToString($bytes).Replace('-', '')
        Set-Content -LiteralPath $secretFile -Value $env:HYPERION_GATEWAY_ADMIN_SECRET -NoNewline
    }
}
$node = (Get-Command node -ErrorAction Stop).Source
$started = @()
function Wait-LocalHealth([string]$url, [System.Diagnostics.Process]$process) {
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 250
        $process.Refresh()
        if ($process.HasExited) { throw "Service exited during startup: $url" }
        try {
            $reply = Invoke-WebRequest -Uri $url -TimeoutSec 1 -UseBasicParsing
            if ($reply.StatusCode -eq 200) { return }
        } catch { }
    }
    throw "Service did not become ready: $url"
}
try {
    $upstream = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','protected_api:app','--app-dir','backend','--host','127.0.0.1','--port','8001') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'upstream.out.log') -RedirectStandardError (Join-Path $localDir 'upstream.err.log')
    $started += $upstream
    Wait-LocalHealth 'http://127.0.0.1:8001/health' $upstream
    $backend = Start-Process -FilePath $python -ArgumentList @('-m','uvicorn','app:app','--app-dir','backend','--host','127.0.0.1','--port','8000') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'backend.out.log') -RedirectStandardError (Join-Path $localDir 'backend.err.log')
    $started += $backend
    Wait-LocalHealth 'http://127.0.0.1:8000/api/health' $backend
    $dashboard = Start-Process -FilePath $node -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173') -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $localDir 'dashboard.out.log') -RedirectStandardError (Join-Path $localDir 'dashboard.err.log')
    $started += $dashboard
    Wait-LocalHealth 'http://127.0.0.1:5173/index.html' $dashboard
    $record = [ordered]@{ upstreamPid=$upstream.Id; backendPid=$backend.Id; dashboardPid=$dashboard.Id; database=$env:HYPERION_DATABASE_PATH; adminSecretFile=$secretFile }
    $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localDir 'networking-services.json')
    Write-Output 'HYPERION Networking is running locally:'
    Write-Output '  Dashboard: http://127.0.0.1:5173/'
    Write-Output '  Gateway:   http://127.0.0.1:8000/gateway/api/v1/users/user_101'
    Write-Output '  Upstream:  http://127.0.0.1:8001/health'
    Write-Output "  Process IDs: $($upstream.Id), $($backend.Id), $($dashboard.Id)"
} catch {
    foreach ($process in $started) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    throw
}
