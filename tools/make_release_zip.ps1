[CmdletBinding()]
param(
    [string]$ProjectRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = (Resolve-Path -LiteralPath $ProjectRoot).Path
if (-not (Test-Path -LiteralPath (Join-Path $root "index.html"))) {
    throw "FAIL: $root does not look like the DungeonDex project root"
}

$packageDir = Join-Path $root "archive\\packages"
$stagingDir = Join-Path $packageDir "_itch_staging"
$outputPath = Join-Path $packageDir "DungeonDex.zip"
$rootFiles = @(
    "index.html",
    "app.js",
    "sw.js",
    "manifest.json",
    "styles.css"
)
$runtimeDirs = @(
    "js\\systems",
    "assets"
)

function Ensure-WithinParent {
    param(
        [string]$ParentPath,
        [string]$ChildPath
    )

    $parentFull = [System.IO.Path]::GetFullPath($ParentPath).TrimEnd('\')
    $childFull = [System.IO.Path]::GetFullPath($ChildPath).TrimEnd('\')
    if (-not $childFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify path outside package directory: $childFull"
    }
}

function Copy-ReleaseFile {
    param(
        [string]$SourcePath,
        [string]$RelativePath
    )

    $destinationPath = Join-Path $stagingDir $RelativePath
    $destinationDir = Split-Path -Parent $destinationPath
    if ($destinationDir) {
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $SourcePath -Destination $destinationPath -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
Ensure-WithinParent -ParentPath $packageDir -ChildPath $stagingDir
Ensure-WithinParent -ParentPath $packageDir -ChildPath $outputPath

if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
}
if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}

New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

$includedCount = 0
foreach ($relPath in $rootFiles) {
    $sourcePath = Join-Path $root $relPath
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "missing required runtime file: $relPath"
    }
    Copy-ReleaseFile -SourcePath $sourcePath -RelativePath $relPath
    $includedCount++
}

foreach ($runtimeDir in $runtimeDirs) {
    $sourceDir = Join-Path $root $runtimeDir
    if (-not (Test-Path -LiteralPath $sourceDir)) {
        continue
    }

    $files = Get-ChildItem -LiteralPath $sourceDir -Recurse -File
    foreach ($file in $files) {
        if ($runtimeDir -eq "js\\systems" -and $file.Extension -ne ".js") {
            continue
        }
        $relativePath = $file.FullName.Substring($root.Length).TrimStart('\')
        Copy-ReleaseFile -SourcePath $file.FullName -RelativePath $relativePath
        $includedCount++
    }
}

Push-Location $stagingDir
try {
    Compress-Archive -Path * -DestinationPath $outputPath -Force
} finally {
    Pop-Location
}

if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

Write-Host "Wrote $outputPath"
Write-Host "Included $includedCount files"
