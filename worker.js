const MODEL = "@cf/zai-org/glm-4.7-flash";
const ALLOWED_ORIGIN = "https://nawroozikian-hue.github.io";

function cors(origin) {
  if (origin !== ALLOWED_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "JARVIS AI" }, 200, headers);
    }

    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin nicht erlaubt." }, 403);
    if (request.method !== "POST" || url.pathname !== "/api/chat") {
      return json({ error: "Nicht gefunden." }, 404, headers);
    }

    try {
      const body = await request.json();
      if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 8) {
        return json({ error: "Ungültiger Gesprächsverlauf." }, 400, headers);
      }

      const messages = body.messages.map((m) => {
        if (!m || !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string") {
          throw new Error("Ungültige Nachricht.");
        }
        return { role: m.role, content: m.content.slice(0, 6000) };
      });

      const result = await env.AI.run(MODEL, {
        messages,
        max_tokens: 450,
        temperature: 0.55
      });

      const answer = result?.response || result?.choices?.[0]?.message?.content;
      if (typeof answer !== "string" || !answer.trim()) {
        return json({ error: "Das KI-Modell hat keine Antwort geliefert." }, 502, headers);
      }
      return json({ answer: answer.trim() }, 200, headers);
    } catch (error) {
      return json({ error: "KI-Anfrage fehlgeschlagen. Bitte später erneut versuchen." }, 500, headers);
    }
  }
};
