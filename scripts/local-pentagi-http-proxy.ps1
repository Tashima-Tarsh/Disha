$ErrorActionPreference = "Stop"

$listen = "http://127.0.0.1:8088/"
$target = "https://127.0.0.1:8443"

Add-Type -AssemblyName System.Net.Http
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.ServerCertificateCustomValidationCallback = { $true }
$client = [System.Net.Http.HttpClient]::new($handler)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($listen)
$listener.Start()
Write-Host "DISHA 6.6 Pentagi HTTP bridge listening on $listen"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  try {
    $request = $context.Request
    $response = $context.Response
    $targetUri = [Uri]::new($target + $request.RawUrl)
    $message = [System.Net.Http.HttpRequestMessage]::new(
      [System.Net.Http.HttpMethod]::new($request.HttpMethod),
      $targetUri
    )

    foreach ($key in $request.Headers.AllKeys) {
      if ($key -in @("Host", "Connection", "Content-Length", "Transfer-Encoding", "Expect")) {
        continue
      }
      [void]$message.Headers.TryAddWithoutValidation($key, $request.Headers[$key])
    }

    if ($request.HasEntityBody) {
      $message.Content = [System.Net.Http.StreamContent]::new($request.InputStream)
      if ($request.ContentType) {
        $message.Content.Headers.TryAddWithoutValidation("Content-Type", $request.ContentType) | Out-Null
      }
    }

    $upstream = $client.SendAsync($message).GetAwaiter().GetResult()
    $response.StatusCode = [int]$upstream.StatusCode

    foreach ($header in $upstream.Headers) {
      foreach ($value in $header.Value) {
        try { $response.Headers.Add($header.Key, $value) } catch {}
      }
    }
    foreach ($header in $upstream.Content.Headers) {
      foreach ($value in $header.Value) {
        try { $response.Headers.Add($header.Key, $value) } catch {}
      }
    }

    $bytes = $upstream.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $body = [Text.Encoding]::UTF8.GetBytes("DISHA 6.6 bridge error: " + $_.Exception.Message)
    $context.Response.StatusCode = 502
    $context.Response.OutputStream.Write($body, 0, $body.Length)
  } finally {
    $context.Response.Close()
  }
}
