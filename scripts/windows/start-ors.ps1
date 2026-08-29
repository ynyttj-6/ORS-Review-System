param(
  [int]$Port = 3000,
  [string]$NodePath = 'node.exe'
)

$ErrorActionPreference = 'Stop'
$appRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$env:HOSTNAME = '192.168.31.56'
$env:PORT = [string]$Port
Set-Location -LiteralPath $appRoot
$envFile = Join-Path $appRoot '.env.local'
$serverFile = Join-Path $appRoot '.next\standalone\server.js'
& $NodePath "--env-file=$envFile" $serverFile
