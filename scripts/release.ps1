$ErrorActionPreference = 'Stop'

Write-Host "[NaviDock Release] Step 1/4 - Install dependencies" -ForegroundColor Cyan
npm ci

Write-Host "[NaviDock Release] Step 2/4 - Frontend build" -ForegroundColor Cyan
npm run build

Write-Host "[NaviDock Release] Step 3/4 - Rust check" -ForegroundColor Cyan
cargo check --manifest-path src-tauri/Cargo.toml

Write-Host "[NaviDock Release] Step 4/4 - Build installers (NSIS + MSI)" -ForegroundColor Cyan
npm run tauri:build -- --ci --bundles nsis,msi

$bundleDir = Join-Path $PSScriptRoot '..\src-tauri\target\release\bundle'
$resolvedBundleDir = Resolve-Path $bundleDir
Write-Host "[NaviDock Release] Done. Installer artifacts:" -ForegroundColor Green
Get-ChildItem -Path $resolvedBundleDir -Recurse -File | Select-Object FullName, Length
