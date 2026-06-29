export async function onRequestPost(context) {
  try {
    const req = context.request;
    const body = await req.json();
    const { profile } = body;
    
    if (!profile || !profile.endpoint || !profile.key) {
      return new Response(JSON.stringify({ ok: false, error: "Missing endpoint or key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

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
    if (profile.format === "openai") {
      testUrl = testUrl + "/models";
    }

    const headers = {
      "Authorization": `Bearer ${profile.key}`,
      "Content-Type": "application/json",
      ...(profile.extraHeaders || {}),
    };

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    const response = await fetch(testUrl, {
      method: "GET",
      headers,
      signal: abortController.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
        const errText = await response.text();
        return new Response(JSON.stringify({ ok: false, error: `Upstream error: ${response.status} ${response.statusText}\n${errText}` }), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    const data = await response.json();
    let models = [];
    
    if (data && Array.isArray(data.data)) {
        models = data.data.map(m => m.id);
    } else if (data && Array.isArray(data.models)) {
        models = data.models.map(m => m.id || m.name || m);
    } else if (Array.isArray(data)) {
        models = data.map(m => m.id || m);
    }

    return new Response(JSON.stringify({ ok: true, models }), {
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
