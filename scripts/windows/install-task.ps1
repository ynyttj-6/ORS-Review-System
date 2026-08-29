param(
  [Parameter(Mandatory = $true)][string]$AppRoot,
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$resolvedRoot = [System.IO.Path]::GetFullPath($AppRoot)
$startScript = Join-Path $resolvedRoot 'scripts\windows\start-ors.ps1'
if (-not (Test-Path -LiteralPath $startScript -PathType Leaf)) { throw "启动脚本不存在：$startScript" }
$powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$node = (Get-Command node.exe -ErrorAction Stop).Source
$arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`" -Port $Port -NodePath `"$node`""
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $resolvedRoot
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'ORS Self Hosted' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "已注册开机任务：ORS Self Hosted（端口 $Port）"
