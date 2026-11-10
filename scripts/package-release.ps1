$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$files = [System.Collections.Generic.List[string]]::new()
foreach ($name in @('assets', 'css', 'js', 'api', 'server', 'scripts', 'tests')) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot $name) -Recurse -File | ForEach-Object { $files.Add($_.FullName) }
}
foreach ($name in @('index.html', 'README.md', 'TESTING.md', 'vercel.json', '.vercelignore')) { $files.Add((Join-Path $projectRoot $name)) }
$onlineRoot = Join-Path $projectRoot 'online'
git -C $onlineRoot ls-files | ForEach-Object { $files.Add((Join-Path $onlineRoot $_)) }
foreach ($name in @('js', 'public', 'server')) {
    Get-ChildItem -LiteralPath (Join-Path $onlineRoot $name) -Recurse -File | ForEach-Object {
        if (-not $files.Contains($_.FullName)) { $files.Add($_.FullName) }
    }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [System.IO.File]::Open((Join-Path $projectRoot 'CIPHER-OPS.zip'), [System.IO.FileMode]::Create)
$zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $relative = $file.Substring($projectRoot.Length + 1).Replace('\', '/')
        if ($relative.StartsWith('../')) { throw 'Release entry outside project' }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $relative, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Write-Output 'Updated CIPHER-OPS.zip (offline game and authored online source; no dependencies, build output, credentials or runtime database).'
