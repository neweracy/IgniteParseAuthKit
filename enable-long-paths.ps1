# Script to enable long paths in Windows (requires Administrator privileges)
# This fixes the "Filename longer than 260 characters" error

Write-Host "Checking if running as Administrator..." -ForegroundColor Yellow

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator', then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Enabling long paths in Windows Registry..." -ForegroundColor Green

try {
    # Enable long paths in Windows 10/11
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -Type DWord
    
    Write-Host "SUCCESS! Long paths have been enabled." -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You may need to restart your computer for the changes to take full effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restarting, try building your Android app again with:" -ForegroundColor Cyan
    Write-Host "  npm run android" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: Failed to enable long paths." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
