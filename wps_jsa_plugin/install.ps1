# JSA-MCP WPS Addon + MCP Server - Offline Installer
# Double-click install.bat to run, or: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

# =============================================
#  Configuration
# =============================================
$AddonName    = "JSA-mcp"
$AddonType    = "et"
$AddonDirName = "JSA-mcp_"          # must end with underscore
$EnableMode   = "enable_dev"        # "enable_dev" = development, "1" = production

$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$DistDir      = Join-Path $ScriptDir "JSA-mcp\dist"
$McpDistDir   = Join-Path $ScriptDir "JSA-mcp\mcp-dist"
$McpEntry     = Join-Path $McpDistDir "index.js"

$WpsRoot      = "$env:APPDATA\kingsoft\wps\jsaddons"
$AddonDir     = Join-Path $WpsRoot $AddonDirName
$PublishXml   = Join-Path $WpsRoot "publish.xml"

function w($m)  { Write-Host "  [>] $m" -ForegroundColor Cyan }
function ok($m) { Write-Host "  [v] $m" -ForegroundColor Green }
function no($m) { Write-Host "  [x] $m" -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "   JSA-MCP  WPS Addon + MCP  Installer"   -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

# =============================================
#  Phase 1: Install WPS Addon
# =============================================

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
if (-not (Test-Path $DistDir)) {
    no "Dist directory not found: $DistDir"
    Read-Host "Press Enter to exit"
    exit 1
}
New-Item -ItemType Directory -Path $AddonDir -Force | Out-Null
$items = Get-ChildItem $DistDir
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
Write-Host "   JSA-MCP addon installed successfully!"  -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Open WPS sheet -> find [wps-jsa-mcp] tab" -ForegroundColor White
Write-Host ""

# =============================================
#  Phase 2: Configure MCP Server
# =============================================

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host "   MCP Server Configuration"               -ForegroundColor Magenta
Write-Host "  ========================================" -ForegroundColor Magenta
Write-Host ""

# Verify mcp-dist exists
if (-not (Test-Path $McpEntry)) {
    no "MCP entry not found: $McpEntry"
    Write-Host "  Skipping MCP configuration..." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

$McpPathSlash = $McpEntry -replace '\\', '/'   # forward slashes for JSON/TOML

Write-Host "  MCP server: $McpPathSlash" -ForegroundColor DarkGray
Write-Host ""

# Platform selection menu
Write-Host "  Select your AI editor / platform:" -ForegroundColor White
Write-Host ""
Write-Host "    [1] VS Code"                     -ForegroundColor Cyan
Write-Host "    [2] VS Code Insiders"            -ForegroundColor Cyan
Write-Host "    [3] Cursor"                      -ForegroundColor Cyan
Write-Host "    [4] Claude Desktop"              -ForegroundColor Cyan
Write-Host "    [5] Claude Code (CLI)"           -ForegroundColor Cyan
Write-Host "    [6] OpenAI Codex CLI"             -ForegroundColor Cyan
Write-Host "    [7] Windsurf"                    -ForegroundColor Cyan
Write-Host "    [8] Skip MCP configuration"      -ForegroundColor DarkGray
Write-Host ""

$choice = Read-Host "  Enter number (1-8)"

switch ($choice) {
    "1" {
        $configPath = "$env:APPDATA\Code\User\mcp.json"
        $jsonTopKey = "servers"
        $platform   = "VS Code"
    }
    "2" {
        $configPath = "$env:APPDATA\Code - Insiders\User\mcp.json"
        $jsonTopKey = "servers"
        $platform   = "VS Code Insiders"
    }
    "3" {
        $configPath = "$env:USERPROFILE\.cursor\mcp.json"
        $jsonTopKey = "mcpServers"
        $platform   = "Cursor"
    }
    "4" {
        $configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
        $jsonTopKey = "mcpServers"
        $platform   = "Claude Desktop"
    }
    "5" {
        $configPath = "$env:USERPROFILE\.claude.json"
        $jsonTopKey = "mcpServers"
        $platform   = "Claude Code"
    }
    "6" {
        $configPath = "$env:USERPROFILE\.codex\config.toml"
        $jsonTopKey = $null   # TOML, not JSON
        $platform   = "OpenAI Codex CLI"
    }
    "7" {
        $configPath = "$env:USERPROFILE\.windsurf\mcp.json"
        $jsonTopKey = "mcpServers"
        $platform   = "Windsurf"
    }
    "8" {
        Write-Host ""
        ok "MCP configuration skipped."
        Read-Host "Press Enter to exit"
        exit 0
    }
    default {
        no "Invalid choice. Skipping MCP configuration."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
w "Configuring MCP for $platform..."
Write-Host "  Config file: $configPath" -ForegroundColor DarkGray

$configDir = Split-Path -Parent $configPath
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Build server entry object
$serverEntry = @{
    command = "node"
    args    = @($McpPathSlash)
}
# VS Code format uses "type": "stdio"
if ($jsonTopKey -eq "servers") {
    $serverEntry["type"] = "stdio"
}

# =============================================
#  Write config
# =============================================

if ($jsonTopKey -eq $null) {
    # ---- TOML format (Codex) ----
    $tomlBlock = @"

[mcp_servers.wpsjsa-mcp]
command = "node"
args = ["$McpPathSlash"]
"@
    if (Test-Path $configPath) {
        $existing = Get-Content $configPath -Raw -Encoding UTF8
        if ($existing -match '\[mcp_servers\.wpsjsa-mcp\]') {
            no "'wpsjsa-mcp' already exists in config. Please check manually."
            Read-Host "Press Enter to exit"
            exit 1
        }
        Add-Content -Path $configPath -Value "`r`n$tomlBlock" -Encoding UTF8
    } else {
        $tomlBlock | Set-Content -Path $configPath -Encoding UTF8
    }
    ok "MCP config added (TOML)"
}
else {
    # ---- JSON format ----
    $newServer = @{ "wpsjsa-mcp" = $serverEntry }

    if (Test-Path $configPath) {
        try {
            $oldJson = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json -ErrorAction Stop
        } catch {
            no "Failed to parse existing config. Creating backup and overwriting..."
            $backup = $configPath + ".backup"
            Move-Item $configPath $backup -Force
            $oldJson = $null
        }
        if ($oldJson) {
            $flat = @{}
            $oldJson.PSObject.Properties | ForEach-Object { $flat[$_.Name] = $_.Value }
            if ($flat.ContainsKey($jsonTopKey)) {
                $srv = @{}
                $flat[$jsonTopKey].PSObject.Properties | ForEach-Object { $srv[$_.Name] = $_.Value }
                $srv["wpsjsa-mcp"] = $serverEntry
                $flat[$jsonTopKey] = $srv
            } else {
                $flat[$jsonTopKey] = $newServer
            }
            $flat | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8
            ok "MCP config merged into existing file"
        } else {
            $newConfig = @{}
            $newConfig[$jsonTopKey] = $newServer
            $newConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8
            ok "MCP config created (existing file backed up)"
        }
    } else {
        $newConfig = @{}
        $newConfig[$jsonTopKey] = $newServer
        $newConfig | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding UTF8
        ok "MCP config created"
    }
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "   All done!"                              -ForegroundColor Green
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Open WPS sheet -> use [JSA-MCP] tab"          -ForegroundColor White
Write-Host "  2. Restart $platform to load the MCP server"     -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
