# ============================================================
# NIVASA FRONTEND - SAFE PROJECT CLEANUP
# ============================================================
# Purpose:
#   - Remove temporary Claude/generated documentation
#   - Remove unused default Vite assets
#   - Remove safely regenerable build/cache folders
#   - Detect unused CSS before deleting it
#   - Update the application title
#   - Create a backup before destructive cleanup
#
# Run from the frontend folder:
#   .\cleanup.ps1
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "       NIVASA FRONTEND CLEANUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# 1. Verify this is the frontend project
# ------------------------------------------------------------

if (-not (Test-Path ".\package.json")) {
    Write-Host "ERROR: package.json was not found." -ForegroundColor Red
    Write-Host "Run this script from the frontend project folder." -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Frontend project detected." -ForegroundColor Green

# ------------------------------------------------------------
# 2. Create backup directory
# ------------------------------------------------------------

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = ".\cleanup-backups\$timestamp"

New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Host "[OK] Backup directory created:" -ForegroundColor Green
Write-Host "     $backupRoot"
Write-Host ""

# ------------------------------------------------------------
# Helper: safely move a file to backup
# ------------------------------------------------------------

function Backup-And-Remove {
    param (
        [string]$Path
    )

    if (Test-Path $Path) {

        $destination = Join-Path $backupRoot $Path
        $destinationDirectory = Split-Path $destination -Parent

        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

        Move-Item -Path $Path -Destination $destination -Force

        Write-Host "[REMOVED] $Path" -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 3. Remove temporary/generated documentation
# ------------------------------------------------------------

Write-Host "Checking temporary documentation..." -ForegroundColor Cyan

$temporaryDocs = @(
    "UPGRADE_SUMMARY.md",
    "PROGRESS_REPORT.md",
    "PHASE_1_COMPLETE.md",
    "FINAL_SUMMARY.md",
    "MOTION_ENHANCEMENTS.md",
    "IMPLEMENTATION_GUIDE.md",
    "UI_UX_UPGRADE_COMPLETE.md",
    "README_REDESIGN.md",
    "QUICK_START.md",
    "WORK_COMPLETE.md",
    "AUDIT_AND_PLAN.md"
)

foreach ($file in $temporaryDocs) {
    Backup-And-Remove $file
}

# ------------------------------------------------------------
# 4. Remove default Vite assets
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking default Vite assets..." -ForegroundColor Cyan

$defaultAssets = @(
    "src\assets\react.svg",
    "src\assets\vite.svg",
    "public\icons.svg"
)

foreach ($file in $defaultAssets) {
    Backup-And-Remove $file
}

# ------------------------------------------------------------
# 5. Safely detect unused CSS files
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking CSS usage..." -ForegroundColor Cyan

$cssFiles = @(
    "src\App.css",
    "src\index.css",
    "src\admin.css"
)

foreach ($css in $cssFiles) {

    if (-not (Test-Path $css)) {
        continue
    }

    $cssName = Split-Path $css -Leaf

    # Search JavaScript/JSX/TS/TSX files for imports/references.
    $references = Get-ChildItem ".\src" -Recurse -File `
        -Include *.js,*.jsx,*.ts,*.tsx `
        -ErrorAction SilentlyContinue |
        Select-String -Pattern [regex]::Escape($cssName) -SimpleMatch `
        -ErrorAction SilentlyContinue

    if ($references) {

        Write-Host "[KEEP] $cssName is referenced by the application." -ForegroundColor Green

        foreach ($reference in $references) {
            Write-Host "       $($reference.Path)" -ForegroundColor DarkGray
        }

    } else {

        Write-Host "[UNUSED] $cssName has no detected JS/JSX references." -ForegroundColor Yellow

        $answer = Read-Host "Move $cssName to backup and remove it? (Y/N)"

        if ($answer -match "^[Yy]$") {
            Backup-And-Remove $css
        } else {
            Write-Host "[KEEP] $cssName" -ForegroundColor Green
        }
    }
}

# ------------------------------------------------------------
# 6. Remove regeneratable build/cache directories
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking build/cache directories..." -ForegroundColor Cyan

$cacheDirectories = @(
    ".\dist",
    ".\build",
    ".\.vite"
)

foreach ($directory in $cacheDirectories) {

    if (Test-Path $directory) {

        Write-Host "[CLEAN] Removing regeneratable directory: $directory" -ForegroundColor Yellow

        Remove-Item $directory -Recurse -Force

        Write-Host "[REMOVED] $directory" -ForegroundColor Green
    }
}

# ------------------------------------------------------------
# 7. Remove empty directories inside src
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking empty directories..." -ForegroundColor Cyan

do {
    $emptyDirectories = Get-ChildItem ".\src" -Directory -Recurse |
        Where-Object {
            @(Get-ChildItem $_.FullName -Force).Count -eq 0
        }

    foreach ($directory in $emptyDirectories) {

        # Never remove these important directories.
        if ($directory.FullName -match "\\src$") {
            continue
        }

        Write-Host "[EMPTY] Removing: $($directory.FullName)" -ForegroundColor DarkYellow

        Remove-Item $directory.FullName -Force
    }

} while ($emptyDirectories.Count -gt 0)

# ------------------------------------------------------------
# 8. Update application title
# ------------------------------------------------------------

Write-Host ""
Write-Host "Checking application title..." -ForegroundColor Cyan

$indexFile = ".\index.html"

if (Test-Path $indexFile) {

    $indexContent = Get-Content $indexFile -Raw

    if ($indexContent -match "<title>.*?</title>") {

        $newContent = $indexContent -replace `
            "<title>.*?</title>", `
            "<title>NIVASA Admin</title>"

        Set-Content $indexFile $newContent -Encoding UTF8

        Write-Host "[UPDATED] Browser title -> NIVASA Admin" -ForegroundColor Green

    } else {

        Write-Host "[INFO] No <title> tag found in index.html." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# 9. Clean backup folder if completely empty
# ------------------------------------------------------------

if ((Get-ChildItem $backupRoot -Recurse -Force -ErrorAction SilentlyContinue).Count -eq 0) {

    Remove-Item $backupRoot -Force

    Write-Host ""
    Write-Host "[INFO] Nothing needed to be backed up." -ForegroundColor DarkGray
}

# ------------------------------------------------------------
# 10. Final summary
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "          CLEANUP COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your source folders were NOT touched." -ForegroundColor Green
Write-Host ""
Write-Host "Important folders preserved:" -ForegroundColor Green
Write-Host "  src\components"
Write-Host "  src\pages"
Write-Host "  src\services"
Write-Host "  src\data"
Write-Host "  src\assets"
Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  npm run lint" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host ""

if (Test-Path ".\cleanup-backups") {
    Write-Host "Any deleted files are recoverable from:" -ForegroundColor Yellow
    Write-Host "  .\cleanup-backups\" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Cleanup finished successfully." -ForegroundColor Green
Write-Host ""