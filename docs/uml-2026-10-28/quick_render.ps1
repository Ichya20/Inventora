param([string]$TaskName)
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WordProcessInfo {
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint pid);
}
'@
$taskWord=New-Object -ComObject Word.Application
$taskWord.Visible=$false
$taskWord.DisplayAlerts=0
$taskWord.AutomationSecurity=3
$taskWord.Options.UpdateLinksAtOpen=$false
$taskWord.Options.PrintBackground=$false
$taskQa='D:\Inventora\tmp\uml-docs-2026-10-28\qa'
$taskDoc=$null
try {
    Write-Output ('OPEN '+$TaskName)
    $taskDoc=$taskWord.Documents.Open((Join-Path $taskQa ($TaskName+'.docx')),$false,$true,$false)
    [uint32]$taskWordPid=0
    [void][WordProcessInfo]::GetWindowThreadProcessId([IntPtr]$taskWord.ActiveWindow.Hwnd,[ref]$taskWordPid)
    [string]$taskWordPid | Set-Content -LiteralPath (Join-Path $taskQa ($TaskName+'.pid'))
    Write-Output ('EXPORT '+$TaskName)
    $taskDoc.ExportAsFixedFormat((Join-Path $taskQa ($TaskName+'.pdf')),17,$false,1,0,1,1000,0,$false,$false,0,$false,$true,$false)
    Write-Output ('DONE '+$TaskName)
} finally {
    if ($null -ne $taskDoc) {$taskDoc.Close(0)}
    $taskWord.Quit()
}
