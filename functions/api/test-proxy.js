export async function onRequestPost(context) {
  try {
    const req = context.request;
    const body = await req.json();
    const { profile, action } = body;
    
    if (!profile || !profile.endpoint || !profile.key) {
      return new Response(JSON.stringify({ ok: false, error: "Missing endpoint or key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const startTime = Date.now();
    let url = profile.endpoint;
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    
    // Remove trailing slash
    url = url.replace(/\/$/, "");
    
    // Auto-append /v1 if missing and format is openai and pathMode is v1/auto
    if (profile.format === "openai" && (profile.pathMode === "v1" || profile.pathMode === "auto") && !url.endsWith("/v1") && !url.includes("/v1/")) {
       url = url + "/v1";
    }

    let testUrl = url;
    let method = "GET";
    let reqBody = undefined;
    
    if (action === "fetch_models") {
      testUrl = testUrl + "/models";
      method = "GET";
    } else {
      // test_generation
      testUrl = testUrl + "/chat/completions";
      method = "POST";
      reqBody = {
        model: profile.model || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Reply with exactly OK." }],
        max_tokens: 10,
        stream: false
      };
    }

    const headers = {
      "Authorization": `Bearer ${profile.key}`,
      "Content-Type": "application/json",
      ...(profile.extraHeaders || {}),
    };

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    const response = await fetch(testUrl, {
      method,
      headers,
      body: reqBody ? JSON.stringify(reqBody) : undefined,
      signal: abortController.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.text();
    const elapsedMs = Date.now() - startTime;
    
    if (!response.ok) {
        return new Response(JSON.stringify({ ok: false, error: `Upstream error: ${response.status} ${response.statusText}\n${data}` }), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    let parsedData = null;
    try {
      parsedData = JSON.parse(data);
    } catch(e) {}

    return new Response(JSON.stringify({
        ok: true,
        endpointUsed: testUrl,
        elapsedMs,
        sample: data.substring(0, 300) + (data.length > 300 ? "..." : ""),
        parsedData
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}

