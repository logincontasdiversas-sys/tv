
addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const url = new URL(request.url);
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return fetch(new URL("/index.html", request.url));
  }
  if (url.pathname.startsWith("/api/kick")) {
    return handleKick(request);
  }
  return new Response("Use /api/kick?channel=paulinholokobr", { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
}

async function handleKick(request) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || "paulinholokobr";
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };
  if (request.method === "OPTIONS") return new Response(null, { headers });
  try {
    if (action === "video" && id) {
      const uuid = id.includes("-") ? id : await idToUuid(id, channel);
      const videoData = await fetchVideo(uuid);
      return new Response(JSON.stringify({ m3u8: videoData.source, source: videoData.source, ...videoData }), { headers });
    }
    const channelUrl = `https://kick.com/api/v2/channels/${channel}`;
    const resp = await fetch(channelUrl, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://kick.com/", "Origin": "https://kick.com", "Cluster": "v2" } });
    const data = await resp.json();
    const previous = data.previous_livestreams || [];
    const vodsWithSource = await Promise.all(previous.map(async (item) => {
      try { const uuid = item.video?.uuid; if (!uuid) return item; const vData = await fetchVideo(uuid); return { ...item, source: vData.source || "", uuid }; } catch { return item; }
    }));
    return new Response(JSON.stringify({ slug: data.slug || channel, playback_url: data.playback_url || "", count: vodsWithSource.length, previous_livestreams: vodsWithSource }), { headers });
  } catch (err) { return new Response(JSON.stringify({ error: err.message }), { status: 500, headers }); }
}

async function idToUuid(numId, channel) {
  try { const url = `https://kick.com/api/v2/channels/${channel}`; const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://kick.com/", "Cluster": "v2" } }); const data = await resp.json(); const found = (data.previous_livestreams || []).find(v => String(v.id) === String(numId)); return found?.video?.uuid || null; } catch { return null; }
}

async function fetchVideo(uuid) {
  const url = `https://kick.com/api/v1/video/${uuid}`; const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://kick.com/", "Origin": "https://kick.com", "Cluster": "v2" } }); const data = await resp.json(); return { source: data.source || "" };
}
