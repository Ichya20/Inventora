param([Parameter(Mandatory=$true)][string]$TaskName)
$ErrorActionPreference='Stop'
$taskQa='D:\Inventora\tmp\uml-docs-2026-10-28\qa'
$taskPriorIds=@(Get-Process WINWORD -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$taskWord=New-Object -ComObject Word.Application
$taskNewProcesses=@(Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object {$_.Id -notin $taskPriorIds})
if ($taskNewProcesses.Count -ne 1) {
    throw 'Cannot verify an isolated Word process; existing Word windows were left untouched.'
}
$taskWordPid=$taskNewProcesses[0].Id
$taskDoc=$null
try {
    $taskWord.Visible=$false
    $taskWord.DisplayAlerts=0
    $taskWord.AutomationSecurity=3
    $taskWord.Options.UpdateLinksAtOpen=$false
    $taskWord.Options.PrintBackground=$false
    Write-Output ('OPEN '+$TaskName+' isolated PID '+$taskWordPid)
    $taskDoc=$taskWord.Documents.Open((Join-Path $taskQa ($TaskName+'.docx')),$false,$true,$false)
    $taskDoc.ExportAsFixedFormat((Join-Path $taskQa ($TaskName+'.pdf')),17,$false,1,0,1,1000,0,$false,$false,0,$false,$true,$false)
    Write-Output ('DONE '+$TaskName)
} finally {
    if ($null -ne $taskDoc) {$taskDoc.Close(0)}
    $taskWord.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskWord)
}
