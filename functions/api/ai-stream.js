export async function onRequestPost(context) {
  try {
    const req = context.request;
    const body = await req.json();
    const { profile, messages, systemPrompt } = body;
    
    if (!profile || !profile.endpoint || !profile.key) {
      return new Response(JSON.stringify({ ok: false, error: "Missing endpoint or key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let url = profile.endpoint;
    if (!url.startsWith("http")) url = "https://" + url;
    
    // Remove trailing slash
    url = url.replace(/\/$/, "");
    
    // Auto-append /v1 if missing and format is openai and pathMode is v1/auto
    if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
       url = url + "/v1";
    }

    let testUrl = url;
    if (profile.format === "openai") {
       testUrl = testUrl + "/chat/completions";
    }

    const headers = {
      "Authorization": `Bearer ${profile.key}`,
      "Content-Type": "application/json",
      ...(profile.extraHeaders || {}),
    };

    const payload = {
      model: profile.model,
      messages: systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages,
      stream: true,
      max_tokens: profile.maxTokens,
    };

    const abortController = new AbortController();
    // Use the timeout setting or fallback to 900 seconds
    const timeoutSeconds = profile.timeoutSeconds || 900;
    const timeoutId = setTimeout(() => abortController.abort(), timeoutSeconds * 1000);

    const response = await fetch(testUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errText = await response.text();
      return new Response(JSON.stringify({ ok: false, error: `Upstream error: ${response.status}\n${errText}` }), {
          status: response.status,
          headers: { "Content-Type": "application/json" }
      });
    }

    // Pass the stream back to the client
    const { readable, writable } = new TransformStream();
    response.body.pipeTo(writable).finally(() => {
        clearTimeout(timeoutId);
    });

    return new Response(readable, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        }
    });

  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
