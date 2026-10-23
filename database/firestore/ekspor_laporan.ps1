param(
  [string]$TaskPdf = 'D:\Inventora\tmp\firebase-report\laporan-v1.pdf'
)
$ErrorActionPreference = 'Stop'
$taskWord = $null
$taskDoc = $null
try {
  $taskWord = New-Object -ComObject Word.Application
  $taskWord.Visible = $false
  $taskWord.DisplayAlerts = 0
  $taskWord.AutomationSecurity = 3
  $taskDoc = $taskWord.Documents.Open('D:\Inventora\output\docx\Inventora_Tugas_Basis_Data_Firebase.docx', $false, $true, $false)
  [void]$taskDoc.Fields.Update()
  $taskDoc.Repaginate()
  $taskResult = [ordered]@{}
  $taskNames = Get-Content -LiteralPath 'D:\Inventora\tmp\firebase-report\bookmarks.json' -Raw | ConvertFrom-Json
  foreach ($taskName in $taskNames) {
    $taskResult[$taskName] = $taskDoc.Bookmarks.Item([string]$taskName).Range.Information(3)
  }
  $taskResult['total_pages'] = $taskDoc.ComputeStatistics(2)
  $taskResult | ConvertTo-Json | Set-Content -LiteralPath 'D:\Inventora\tmp\firebase-report\pages.json' -Encoding utf8
  $taskDoc.ExportAsFixedFormat($TaskPdf, 17)
  $taskResult | ConvertTo-Json
} finally {
  if ($null -ne $taskDoc) { $taskDoc.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskDoc) }
  if ($null -ne $taskWord) { $taskWord.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($taskWord) }
}
