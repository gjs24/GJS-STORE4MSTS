Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Repairing Git Index for MSTS-GJS Production Store" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (Test-Path ".git\index.lock") {
    Write-Host "Removing stale .git\index.lock..." -ForegroundColor Yellow
    Remove-Item -Force ".git\index.lock"
}

if (Test-Path ".git\index") {
    Write-Host "Removing corrupted .git\index..." -ForegroundColor Yellow
    Remove-Item -Force ".git\index"
}

Write-Host "Rebuilding index from HEAD..." -ForegroundColor Green
git reset

Write-Host "`nChecking Git status..." -ForegroundColor Cyan
git status

Write-Host "`nGit index repaired successfully!" -ForegroundColor Green
