# DungeonDex Itch Package Builder
# Run this from your local DungeonDex repo folder.
# Output: dist\DungeonDex_v1.23.8.01_ItchReady.zip

$ErrorActionPreference = "Stop"

$Version = "v1.23.8.01"
$BuildName = "DungeonDex_$Version`_ItchReady"

$Root = Get-Location
$DistDir = Join-Path $Root "dist"
$StageDir = Join-Path $DistDir $BuildName
$ZipPath = Join-Path $DistDir "$BuildName.zip"

Write-Host ""
Write-Host "DungeonDex itch package builder" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Output: $ZipPath"
Write-Host ""

# Clean old package output
if (Test-Path $StageDir) {
    Remove-Item $StageDir -Recurse -Force
}

if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
}

if (!(Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

New-Item -ItemType Directory -Path $StageDir | Out-Null

# Folders excluded from public itch package
$ExcludeDirs = @(
    ".git",
    ".github",
    ".vscode",
    "node_modules",
    "dist",
    "tools",
    "tests",
    "test",
    "docs",
    "archive",
    "coverage",
    "data"
)

# File patterns excluded from public itch package
$ExcludeFilePatterns = @(
    "smoke*.mjs",
    "*smoke*.mjs",
    "*.map",
    "*.log",
    "*.tmp",
    "*.bak",
    "*.ps1",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "jsconfig.json",
    "AGENTS.md",
    "DUNGEONDEX_CURRENT_NOTES.md",
    "PATCH*.md",
    "ITCH_PACKAGE_MANIFEST*.md",
    "DEVLOG*.md"
)

# Specific dev/test runtime files excluded
$ExcludeExactFiles = @(
    "js/systems/13_devtools_overlay.js",
    "js/systems/14_devtools_scenarios.js",
    "js/systems/15_devtools_balance_reports.js"
)

function Normalize-RelPath {
    param([string]$Path)
    return $Path.Replace("\", "/")
}

function Should-Exclude-Dir {
    param([string]$FullPath)

    $rel = Normalize-RelPath ($FullPath.Substring($Root.Path.Length).TrimStart("\", "/"))

    foreach ($dir in $ExcludeDirs) {
        if ($rel -eq $dir -or $rel.StartsWith("$dir/") -or $rel.Contains("/$dir/")) {
            return $true
        }
    }

    return $false
}

function Should-Exclude-File {
    param([System.IO.FileInfo]$File)

    $rel = Normalize-RelPath ($File.FullName.Substring($Root.Path.Length).TrimStart("\", "/"))

    foreach ($exact in $ExcludeExactFiles) {
        if ($rel -eq $exact) {
            return $true
        }
    }

    foreach ($pattern in $ExcludeFilePatterns) {
        if ($File.Name -like $pattern) {
            return $true
        }
    }

    return $false
}

Write-Host "Copying public game files..." -ForegroundColor Yellow

$Files = Get-ChildItem -Path $Root -Recurse -File | Where-Object {
    $file = $_
    $parentExcluded = $false

    $dir = $file.Directory
    while ($dir -and $dir.FullName.StartsWith($Root.Path)) {
        if (Should-Exclude-Dir $dir.FullName) {
            $parentExcluded = $true
            break
        }
        $dir = $dir.Parent
    }

    -not $parentExcluded -and -not (Should-Exclude-File $file)
}

foreach ($file in $Files) {
    $rel = $file.FullName.Substring($Root.Path.Length).TrimStart("\", "/")
    $target = Join-Path $StageDir $rel
    $targetDir = Split-Path $target -Parent

    if (!(Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    Copy-Item $file.FullName $target -Force
}

Write-Host "Cleaning public references..." -ForegroundColor Yellow

# Clean index.html references to removed devtool scripts and align visible build label/query.
$IndexPath = Join-Path $StageDir "index.html"
if (Test-Path $IndexPath) {
    $index = Get-Content $IndexPath -Raw

    # Update visible/runtime build labels in packaged index.
    $index = $index -replace "DungeonDex v1\.23\.8", "DungeonDex v1.23.8.01"
    $index = $index -replace "1\.23\.8-merchant-gear-upgrades-replace-talent-system", "1.23.8.01-gear-section-polish"
    $index = $index -replace "window\.DUNGEONDEX_BUILD = '1\.23\.8';", "window.DUNGEONDEX_BUILD = '1.23.8.01';"
    $index = $index -replace "window\.DUNGEONDEX_BUILD_QS = '1\.23\.8\.01-gear-section-polish';", "window.DUNGEONDEX_BUILD_QS = '1.23.8.01-gear-section-polish';"

    # Remove public package references to devtool scripts.
    $index = $index -replace "(?m)^\s*<script src=""\.\/js\/systems\/13_devtools_overlay\.js\?build=[^""]+""></script>\s*\r?\n?", ""
    $index = $index -replace "(?m)^\s*<script src=""\.\/js\/systems\/14_devtools_scenarios\.js\?build=[^""]+""></script>\s*\r?\n?", ""
    $index = $index -replace "(?m)^\s*<script src=""\.\/js\/systems\/15_devtools_balance_reports\.js\?build=[^""]+""></script>\s*\r?\n?", ""

    Set-Content -Path $IndexPath -Value $index -Encoding UTF8
}

# Clean app.js dynamic devtool extension loads.
$AppPath = Join-Path $StageDir "app.js"
if (Test-Path $AppPath) {
    $app = Get-Content $AppPath -Raw

    $app = $app -replace "1\.23\.8-merchant-gear-upgrades-replace-talent-system", "1.23.8.01-gear-section-polish"
    $app = $app -replace "window\.DUNGEONDEX_BUILD = '1\.23\.8';", "window.DUNGEONDEX_BUILD = '1.23.8.01';"
    $app = $app -replace "window\.DUNGEONDEX_BUILD_QS = '1\.23\.8\.01-gear-section-polish';", "window.DUNGEONDEX_BUILD_QS = '1.23.8.01-gear-section-polish';"

    # Remove dynamic devtool loads from public build.
    $app = $app -replace "(?m)^\s*loadModule\('\.\/js\/systems\/14_devtools_scenarios\.js\?build=' \+ qs, 'DungeonDexScenarioDevTools', 'DevTools scenario presets'\);\s*\r?\n?", ""
    $app = $app -replace "(?m)^\s*loadModule\('\.\/js\/systems\/15_devtools_balance_reports\.js\?build=' \+ qs, 'DungeonDexBalanceReports', 'DevTools balance reports'\);\s*\r?\n?", ""

    Set-Content -Path $AppPath -Value $app -Encoding UTF8
}

# Clean sw.js cache list so it does not try to precache removed devtool files.
$SwPath = Join-Path $StageDir "sw.js"
if (Test-Path $SwPath) {
    $sw = Get-Content $SwPath -Raw

    $sw = $sw -replace "dungeondex-v1\.23\.8-merchant-gear-upgrades-replace-talent-system", "dungeondex-v1.23.8.01-gear-section-polish"
    $sw = $sw -replace "1\.23\.8-merchant-gear-upgrades-replace-talent-system", "1.23.8.01-gear-section-polish"

    $sw = $sw -replace "(?m)^\s*`\.\/js\/systems\/13_devtools_overlay\.js\?build=\$\{BUILD_QS\}`,?\s*\r?\n?", ""
    $sw = $sw -replace "(?m)^\s*`\.\/js\/systems\/14_devtools_scenarios\.js\?build=\$\{BUILD_QS\}`,?\s*\r?\n?", ""
    $sw = $sw -replace "(?m)^\s*`\.\/js\/systems\/15_devtools_balance_reports\.js\?build=\$\{BUILD_QS\}`,?\s*\r?\n?", ""

    Set-Content -Path $SwPath -Value $sw -Encoding UTF8
}

# Remove empty folders left behind by exclusions.
Get-ChildItem $StageDir -Recurse -Directory |
    Sort-Object FullName -Descending |
    ForEach-Object {
        if (!(Get-ChildItem $_.FullName -Force | Select-Object -First 1)) {
            Remove-Item $_.FullName -Force
        }
    }

# Sanity checks
Write-Host "Running package sanity checks..." -ForegroundColor Yellow

$RequiredFiles = @(
    "index.html",
    "app.js",
    "styles.css",
    "sw.js",
    "manifest.json"
)

foreach ($required in $RequiredFiles) {
    $path = Join-Path $StageDir $required
    if (!(Test-Path $path)) {
        throw "Missing required public file: $required"
    }
}

$LeakFiles = Get-ChildItem $StageDir -Recurse -File | Where-Object {
    $_.Name -like "smoke*.mjs" -or
    $_.Name -like "*smoke*.mjs" -or
    $_.Name -eq "AGENTS.md" -or
    $_.Name -eq "package.json" -or
    $_.Name -eq "package-lock.json" -or
    $_.Name -eq "jsconfig.json"
}

if ($LeakFiles.Count -gt 0) {
    Write-Host "Blocked dev/test files found:" -ForegroundColor Red
    $LeakFiles | ForEach-Object { Write-Host " - $($_.FullName)" -ForegroundColor Red }
    throw "Package contains dev/test files."
}

$IndexCheck = Get-Content $IndexPath -Raw
if ($IndexCheck -match "devtools|smoke_|smoke-|smoke\.|smoke") {
    throw "index.html still contains dev/smoke references."
}

$AppCheck = Get-Content $AppPath -Raw
if ($AppCheck -match "DevTools scenario presets|DevTools balance reports") {
    throw "app.js still contains devtool dynamic loads."
}

$SwCheck = Get-Content $SwPath -Raw
if ($SwCheck -match "13_devtools_overlay|14_devtools_scenarios|15_devtools_balance_reports") {
    throw "sw.js still contains devtool cache entries."
}

Write-Host "Creating ZIP..." -ForegroundColor Yellow

Compress-Archive -Path (Join-Path $StageDir "*") -DestinationPath $ZipPath -Force

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Write-Host "Itch-ready ZIP created:"
Write-Host $ZipPath -ForegroundColor Cyan
Write-Host ""
Write-Host "Upload this ZIP to itch.io as the HTML/browser build."
Write-Host "Make sure itch is set to launch index.html."
Write-Host ""