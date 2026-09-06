$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
python -m PyInstaller --noconfirm --clean --onefile --windowed --name ApiTester api_tester.py
Write-Host "EXE 已生成：$root\dist\ApiTester.exe"
