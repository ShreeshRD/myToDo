@echo off
rem Windows entry point for dev.ps1. Lets `dev.cmd` work from cmd.exe,
rem PowerShell, or a double-click and bypasses local execution policy.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
exit /b %ERRORLEVEL%
