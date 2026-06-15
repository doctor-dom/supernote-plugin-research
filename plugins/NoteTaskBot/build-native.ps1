# Full native build for NoteTaskBot (.snplg with react-native-fs)
# Usage:
#   $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.8.9-hotspot"
#   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
#   powershell -ExecutionPolicy Bypass -File build-native.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (Test-Path (Join-Path $root 'local-build.ps1')) {
    . (Join-Path $root 'local-build.ps1')
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    Write-Error "JAVA_HOME must point to a JDK install (bin\java.exe not found). Current: '$($env:JAVA_HOME)'"
}
if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    Write-Error "ANDROID_HOME must point to the Android SDK root. Current: '$($env:ANDROID_HOME)'"
}

$sdkDir = $env:ANDROID_HOME -replace '\\', '/'
$localProps = Join-Path $root 'android\local.properties'
"sdk.dir=$sdkDir" | Set-Content -Path $localProps -Encoding ASCII
Write-Host "Wrote $localProps" -ForegroundColor Green

Remove-Item -Recurse -Force (Join-Path $root 'build') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root 'android\app\build') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $root 'android\.gradle') -ErrorAction SilentlyContinue

Push-Location $root
try {
    & (Join-Path $root 'buildPlugin.ps1')
} finally {
    Pop-Location
}

$out = Join-Path $root 'build\outputs\NoteTaskBot.snplg'
if (-not (Test-Path $out)) {
    Write-Error "Build failed: $out not found"
}

$sizeMb = [math]::Round((Get-Item $out).Length / 1MB, 2)
$genCfg = Join-Path $root 'build\generated\PluginConfig.json'
$hasNative = $false
if (Test-Path $genCfg) {
    $cfg = Get-Content $genCfg -Raw | ConvertFrom-Json
    $hasNative = [bool]$cfg.nativeCodePackage
}

Write-Host ""
Write-Host "Output: $out ($sizeMb MB)" -ForegroundColor Cyan
Write-Host "nativeCodePackage: $hasNative" -ForegroundColor $(if ($hasNative) { 'Green' } else { 'Red' })

if ($sizeMb -lt 1 -or -not $hasNative) {
    Write-Error "This looks like a JS-only build. Gradle/native module did not bundle. Check JAVA_HOME, ANDROID_HOME, and Gradle output above."
}

Write-Host "Native build OK." -ForegroundColor Green
