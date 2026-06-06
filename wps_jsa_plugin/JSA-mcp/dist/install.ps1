# JSA-MCP WPS Addon - Offline Installer
# Double-click install.bat to run, or: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$AddonName    = "JSA-mcp"
$AddonType    = "et"
$AddonDirName = "JSA-mcp_"          # must end with underscore
$EnableMode   = "enable_dev"        # "enable_dev" = development, "1" = production

$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$WpsRoot      = "$env:APPDATA\kingsoft\wps\jsaddons"
$AddonDir     = Join-Path $WpsRoot $AddonDirName
$PublishXml   = Join-Path $WpsRoot "publish.xml"

function w($m)  { Write-Host "  [>] $m" -ForegroundColor Cyan }
function ok($m) { Write-Host "  [v] $m" -ForegroundColor Green }
function no($m) { Write-Host "  [x] $m" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "   JSA-MCP  WPS Addon  Installer"          -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

# Close WPS
w "Closing WPS if running..."
$p = Get-Process -Name "wps","et","wpp" -ErrorAction SilentlyContinue
if ($p) { $p | Stop-Process -Force -ErrorAction SilentlyContinue; Start-Sleep 2; ok "Closed" }
else { ok "Not running" }

# Clean old installs (both _ and non-_ variants)
w "Cleaning old installations..."
foreach ($dn in @($AddonDirName, "JSA-mcp")) {
    $dp = Join-Path $WpsRoot $dn
    if (Test-Path $dp) {
        Remove-Item -Recurse -Force $dp -ErrorAction SilentlyContinue
        ok "Removed old: $dn"
    }
}

# Copy all dist files to JSA-mcp_ folder
w "Copying addon files to $AddonDir..."
New-Item -ItemType Directory -Path $AddonDir -Force | Out-Null
$items = Get-ChildItem $ScriptDir -Exclude "install.ps1","install.bat"
foreach ($item in $items) {
    Copy-Item $item.FullName $AddonDir -Recurse -Force
}
ok "Files copied ($($items.Count) items)"

# Create publish.xml (using %AppData% variable for dynamic resolution)
w "Writing publish.xml..."
$xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<jsplugins>
<jsplugin name="JSA-mcp" type="et" url="file://%AppData%/kingsoft/wps/jsaddons/JSA-mcp_/index.html" debug="" enable="enable_dev"/>
</jsplugins>'

$xml | Set-Content -Path $PublishXml -Encoding UTF8
ok "publish.xml created"

# Verify
w "Verifying..."
$vDir  = Test-Path $AddonDir
$vIdx  = Test-Path (Join-Path $AddonDir "index.html")
$vRbn  = Test-Path (Join-Path $AddonDir "ribbon.xml")
$vXml  = Test-Path $PublishXml

if ($vDir -and $vIdx -and $vRbn -and $vXml) {
    ok "All OK: dir=$vDir index.html=$vIdx ribbon.xml=$vRbn publish.xml=$vXml"
} else {
    no "Verification failed"; Read-Host "Exit"; exit 1
}

# Show publish.xml content
Write-Host ""
Write-Host "  publish.xml:" -ForegroundColor DarkGray
Write-Host "  url: file://%AppData%/kingsoft/wps/jsaddons/$AddonDirName/index.html" -ForegroundColor DarkGray

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "   JSA-MCP installed successfully!"        -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Open WPS sheet -> find [wps-jsa-mcp] tab" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
