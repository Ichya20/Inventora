$ErrorActionPreference = 'Stop'
$taskRoot = 'D:\Inventora\tmp\uml-docs-2026-10-28'
$taskDocs = 'D:\Inventora\output\docx\uml-2026-10-28'
$taskQa = Join-Path $taskRoot 'qa'
[void](New-Item -ItemType Directory -Path $taskQa -Force)
$taskWord = $null
$taskDoc = $null
$taskResults = @()
try {
    $taskWord = New-Object -ComObject Word.Application
    $taskWord.Visible = $false
    $taskWord.DisplayAlerts = 0
    $taskWord.AutomationSecurity = 3
    $taskWord.Options.UpdateLinksAtOpen = $false
    $taskWord.Options.PrintBackground = $false
    foreach ($taskKind in @('SKPL', 'DPPL')) {
        Write-Output ('OPEN ' + $taskKind)
        $taskPath = Join-Path $taskDocs ($taskKind + '_Inventora_Rapi (1).docx')
        $taskDoc = $taskWord.Documents.Open($taskPath, $false, $true, $false)
        $taskPdf = Join-Path $taskQa ($taskKind.ToLower() + '.pdf')
        $taskDoc.ExportAsFixedFormat($taskPdf, 17, $false, 1, 0, 1, 100, 0, $false, $false, 0, $false, $true, $false)
        Write-Output ('EXPORTED ' + $taskKind)
        $taskPages = $taskDoc.ComputeStatistics(2)
        $taskResults += [ordered]@{ kind = $taskKind; pages = $taskPages; pdf = $taskPdf }
        $taskDoc.Close(0)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskDoc)
        $taskDoc = $null
    }
} finally {
    if ($null -ne $taskDoc) {
        $taskDoc.Close(0)
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskDoc)
    }
    if ($null -ne $taskWord) {
        $taskWord.Quit()
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord)
    }
}
$taskResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskRoot 'render-manifest.json') -Encoding utf8
$taskResults | ConvertTo-Json -Depth 4
