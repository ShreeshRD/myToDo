#Requires -Version 5.1
<#
.SYNOPSIS
    Launch both dev servers on Windows: backend (Spring Boot) and frontend (Next.js).

.DESCRIPTION
    Windows alternative to ./dev.sh. The backend always runs the dev profile:
    port 8000 and the dev database (backend-springboot/todo-dev.db). The prod
    port 5555 and the personal prod database (todo-prod/todo.db) are only
    produced/used by update-prod.sh — dev must never touch them.

    Press Ctrl+C to stop everything. If either server exits, the other is
    stopped too, so you never run with a missing piece.

.PARAMETER BackendOnly
    Start only the Spring Boot backend.

.PARAMETER FrontendOnly
    Start only the Next.js frontend.

.EXAMPLE
    .\dev.ps1
    .\dev.ps1 -BackendOnly
#>
[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$BackendDir = Join-Path $Root 'backend-springboot'
$FrontendDir = Join-Path $Root 'frontend-next'

if ($BackendOnly -and $FrontendOnly) {
    throw 'Choose at most one of -BackendOnly and -FrontendOnly.'
}

$script:Children = @()

function Write-Dev([string]$Message) {
    Write-Host "[dev] $Message"
}

function Stop-Servers {
    if ($script:Children.Count -eq 0) { return }

    # taskkill writes errors when a process is already gone; never let that
    # abort cleanup or leak to the console.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        # Ask each process tree to close, then force whatever is left. taskkill /T
        # covers the cmd.exe -> mvnw -> java and npm -> node chains.
        foreach ($child in $script:Children) {
            if ($null -ne $child -and -not $child.HasExited) {
                & taskkill.exe /PID $child.Id /T *> $null
            }
        }
        Start-Sleep -Milliseconds 1500
        foreach ($child in $script:Children) {
            if ($null -ne $child -and -not $child.HasExited) {
                & taskkill.exe /PID $child.Id /T /F *> $null
            }
        }
    }
    finally {
        $ErrorActionPreference = $previousPreference
        $script:Children = @()
    }
}

function Start-DevServer {
    param(
        [string]$Name,
        [string]$Directory,
        [string]$FilePath,
        [string[]]$Arguments
    )

    Write-Dev ("starting {0} ({1}): {2} {3}" -f $Name.PadRight(8), $Directory, $FilePath, ($Arguments -join ' '))
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments `
        -WorkingDirectory $Directory -PassThru -NoNewWindow
    $script:Children += $process
    return $process
}

function Assert-Java {
    if ($env:JAVA_HOME) {
        if (-not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
            throw "JAVA_HOME is set to '$env:JAVA_HOME' but bin\java.exe was not found. Point it at a JDK 21 install."
        }
        return
    }
    if (-not (Get-Command java.exe -ErrorAction SilentlyContinue)) {
        throw 'Java 21 is required. Install a JDK and set JAVA_HOME (or add java.exe to PATH).'
    }
}

if (-not $FrontendOnly) {
    $mvnw = Join-Path $BackendDir 'mvnw.cmd'
    if (-not (Test-Path $mvnw)) {
        throw "Maven wrapper not found at $mvnw."
    }
    Assert-Java
}

if (-not $BackendOnly) {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'npm was not found on PATH. Install Node.js first.'
    }
    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
        throw "Frontend dependencies are missing. Run: cd `"$FrontendDir`"; npm install"
    }
}

$cancelHandler = [ConsoleCancelEventHandler]{
    param($sender, $eventArgs)
    $eventArgs.Cancel = $true
    Write-Host ''
    Write-Dev 'shutting down all servers...'
    Stop-Servers
    exit 130
}

$exitCode = 0
try {
    [Console]::add_CancelKeyPress($cancelHandler)

    if (-not $FrontendOnly) {
        $null = Start-DevServer -Name 'backend' -Directory $BackendDir `
            -FilePath (Join-Path $BackendDir 'mvnw.cmd') `
            -Arguments @('spring-boot:run', '-Dspring-boot.run.profiles=dev')
    }
    if (-not $BackendOnly) {
        $null = Start-DevServer -Name 'frontend' -Directory $FrontendDir `
            -FilePath 'npm.cmd' -Arguments @('run', 'dev')
    }

    Write-Dev 'servers running. Press Ctrl+C to stop.'

    while ($true) {
        Start-Sleep -Milliseconds 500
        $exited = $script:Children | Where-Object { $_.HasExited } | Select-Object -First 1
        if ($exited) {
            $code = 0
            try { $code = [int]$exited.ExitCode } catch { $code = 1 }
            Write-Dev ("a server exited (status {0}); stopping the others." -f $code)
            $exitCode = $code
            break
        }
    }
}
finally {
    try { [Console]::remove_CancelKeyPress($cancelHandler) } catch { }
    Stop-Servers
}

exit $exitCode
