<#
DungeonDex itch-ready package builder.
Creates a clean browser zip with index.html at the zip root.

Usage from repo root:
  powershell -ExecutionPolicy Bypass -File .\tools\build_itch_ready.ps1

Optional:
  powershell -ExecutionPolicy Bypass -File .\tools\build_itch_ready.ps1 -SkipSmoke
  powershell -ExecutionPolicy Bypass -File .\tools\build_itch_ready.ps1 -OutputName DungeonDex_Test.zip
#>

[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$OutputName = "",
    [switch]$SkipSmoke,
    [switch]$SkipPackageCheck,
    [switch]$KeepStage
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail {
    param([string]$Message)
    throw "ITCH PACKAGE FAIL: $Message"
}

function Resolve-RepoRoot {
    param([string]$RequestedRoot)

    if ($RequestedRoot -and $RequestedRoot.Trim().Length -gt 0) {
        return (Resolve-Path -LiteralPath $RequestedRoot).Path
    }

    $candidate = (Get-Location).Path
    if (Test-Path -LiteralPath (Join-Path $candidate "index.html")) {
        return $candidate
    }

    if ($PSScriptRoot) {
        $fromScript = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
        if (Test-Path -LiteralPath (Join-Path $fromScript "index.html")) {
            return $fromScript
        }
    }

    Fail "Run this from the DungeonDex repo root, or pass -RepoRoot C:\path\to\DungeonDex."
}

function Resolve-PythonCommand {
    $candidates = @(
        @("py", "-3"),
        @("python", ""),
        @("python3", "")
    )

    foreach ($candidate in $candidates) {
        $cmd = $candidate[0]
        $arg = $candidate[1]
        $found = Get-Command $cmd -ErrorAction SilentlyContinue
        if ($found) {
            if ($arg) { return @($cmd, $arg) }
            return @($cmd, $null)
        }
    }

    return @($null, $null)
}

function Copy-RequiredFile {
    param(
        [string]$Root,
        [string]$Stage,
        [string]$RelativePath
    )

    $source = Join-Path $Root $RelativePath
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) {
        Fail "Missing required runtime file: $RelativePath"
    }

    $target = Join-Path $Stage $RelativePath
    $targetDir = Split-Path -Parent $target
    if (!(Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }
    Copy-Item -LiteralPath $source -Destination $target -Force
}

function Copy-RuntimeDirectory {
    param(
        [string]$Root,
        [string]$Stage,
        [string]$RelativePath
    )

    $source = Join-Path $Root $RelativePath
    if (!(Test-Path -LiteralPath $source -PathType Container)) {
        return
    }

    $target = Join-Path $Stage $RelativePath
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $target) | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Recurse -Force

    Get-ChildItem -LiteralPath $target -Recurse -Force |
        Where-Object {
            $_.Name -eq ".DS_Store" -or
            $_.Name -like "._*" -or
            $_.FullName -match "__MACOSX"
        } |
        Remove-Item -Recurse -Force
}

function Read-DungeonDexVersion {
    param([string]$Root)

    $versionFile = Join-Path $Root "VERSION.md"
    if (Test-Path -LiteralPath $versionFile -PathType Leaf) {
        $text = Get-Content -LiteralPath $versionFile -Raw
        $match = [regex]::Match($text, "v?\d+(?:\.\d+){1,4}")
        if ($match.Success) {
            $value = $match.Value
            if ($value.StartsWith("v")) { return $value }
            return "v$value"
        }
    }

    $appFile = Join-Path $Root "app.js"
    if (Test-Path -LiteralPath $appFile -PathType Leaf) {
        $text = Get-Content -LiteralPath $appFile -Raw
        $match = [regex]::Match($text, "v\d+(?:\.\d+){1,4}")
        if ($match.Success) { return $match.Value }
    }

    return "vUnknown"
}

function Assert-ZipLooksItchReady {
    param([string]$ZipPath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entries = @($zip.Entries | ForEach-Object { $_.FullName.Replace("\\", "/") })

        if ($entries -notcontains "index.html") {
            Fail "Zip does not have index.html at the root. Itch browser uploads need root-level index.html."
        }
        if ($entries -contains "DungeonDex/index.html") {
            Fail "Zip has a nested DungeonDex/index.html. Rebuild with root-level files only."
        }

        $badEntries = $entries | Where-Object {
            $_ -match "(^|/)\.git(/|$)" -or
            $_ -match "(^|/)node_modules(/|$)" -or
            $_ -match "(^|/)archive(/|$)" -or
            $_ -match "(^|/)tools(/|$)" -or
            $_ -match "(^|/)docs(/|$)" -or
            $_ -match "\.zip$" -or
            $_ -match "\.ps1$"
        }

        if ($badEntries.Count -gt 0) {
            Fail "Zip contains non-runtime/dev files:`n$($badEntries -join "`n")"
        }
    }
    finally {
        $zip.Dispose()
    }
}

$root = Resolve-RepoRoot -RequestedRoot $RepoRoot
Write-Step "Using repo root: $root"

$requiredRootFiles = @(
    "index.html",
    "app.js",
    "styles.css",
    "sw.js",
    "manifest.json"
)

foreach ($file in $requiredRootFiles) {
    if (!(Test-Path -LiteralPath (Join-Path $root $file) -PathType Leaf)) {
        Fail "Missing required file: $file"
    }
}

$version = Read-DungeonDexVersion -Root $root
if (!$OutputName -or $OutputName.Trim().Length -eq 0) {
    $OutputName = "DungeonDex_${version}_ItchReady.zip"
}
if (!$OutputName.ToLowerInvariant().EndsWith(".zip")) {
    $OutputName = "$OutputName.zip"
}

$packageDir = Join-Path $root "archive\packages"
$stageDir = Join-Path $packageDir "_itch_stage"
$outZip = Join-Path $packageDir $OutputName

Write-Step "Preparing clean stage folder"
New-Item -ItemType Directory -Force -Path $packageDir | Out-Null
if (Test-Path -LiteralPath $stageDir) {
    Remove-Item -LiteralPath $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null

Write-Step "Copying browser runtime files"
foreach ($file in $requiredRootFiles) {
    Copy-RequiredFile -Root $root -Stage $stageDir -RelativePath $file
}
Copy-RuntimeDirectory -Root $root -Stage $stageDir -RelativePath "js\systems"
Copy-RuntimeDirectory -Root $root -Stage $stageDir -RelativePath "assets"

if (!(Test-Path -LiteralPath (Join-Path $stageDir "js\systems") -PathType Container)) {
    Fail "Stage is missing js\systems. The modular browser runtime will not load."
}

Write-Step "Running syntax checks"
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Push-Location $root
    try {
        & node --check app.js
        & node --check sw.js
        Get-ChildItem -LiteralPath (Join-Path $root "js\systems") -Filter "*.js" -File | ForEach-Object {
            & node --check $_.FullName
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Warning "Node was not found, so syntax checks were skipped. Install Node or run checks manually before uploading."
}

if (!$SkipSmoke) {
    $compactSmoke = Join-Path $root "smoke_compact_suite.mjs"
    if ($node -and (Test-Path -LiteralPath $compactSmoke -PathType Leaf)) {
        Write-Step "Running compact smoke suite"
        Push-Location $root
        try {
            & node smoke_compact_suite.mjs
        }
        finally {
            Pop-Location
        }
    }
    else {
        Write-Host "==> Compact smoke suite not found; skipping smoke step." -ForegroundColor Yellow
    }
}

if (!$SkipPackageCheck) {
    $packageCheck = Join-Path $root "tools\check_dungeondex_package.py"
    if (Test-Path -LiteralPath $packageCheck -PathType Leaf) {
        $pythonCmd = Resolve-PythonCommand
        if ($pythonCmd.Count -gt 0) {
            Write-Step "Running package check against staged itch files"
            $exe = $pythonCmd[0]
            $argsList = @()
            if ($pythonCmd.Count -gt 1) { $argsList += $pythonCmd[1] }
            $argsList += @($packageCheck, $stageDir)
            & $exe @argsList
        }
        else {
            Write-Warning "Python was not found, so tools\check_dungeondex_package.py was skipped."
        }
    }
    else {
        Write-Host "==> Package checker not found; skipping Python package check." -ForegroundColor Yellow
    }
}

Write-Step "Creating itch-ready zip"
if (Test-Path -LiteralPath $outZip) {
    Remove-Item -LiteralPath $outZip -Force
}
Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $outZip -CompressionLevel Optimal -Force

Write-Step "Verifying zip structure"
Assert-ZipLooksItchReady -ZipPath $outZip

if (!$KeepStage) {
    Remove-Item -LiteralPath $stageDir -Recurse -Force
}

$zipInfo = Get-Item -LiteralPath $outZip
Write-Host ""
Write-Host "PASS: itch-ready package created" -ForegroundColor Green
Write-Host "File: $($zipInfo.FullName)"
Write-Host "Size: $([math]::Round($zipInfo.Length / 1MB, 2)) MB"
Write-Host "Version label: $version"
Write-Host ""
Write-Host "Upload this zip to itch.io as an HTML/browser build."
