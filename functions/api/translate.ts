// Cloudflare Pages Function -- runs server-side, so it's the only safe place
// to hold the Anthropic API key. The rest of this app is a static export
// with no server/API routes (see next.config.ts), so this file is what
// keeps `ANTHROPIC_API_KEY` out of the browser bundle: set it as a secret
// on the Cloudflare Pages project (Settings -> Environment variables), and
// it never reaches the client. The client (src/lib/translate.ts) POSTs the
// batch of not-yet-cached UI strings here once per language, then caches
// the results in localStorage so this only runs once per string per
// language, not on every page load.

interface Env {
  ANTHROPIC_API_KEY: string;
}

type PagesContext = {
  request: Request;
  env: Env;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Translation is not configured on this deployment." }, 500);
  }

  let body: { language?: string; texts?: string[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { language, texts } = body;
  if (!language || !Array.isArray(texts) || texts.length === 0) {
    return json({ error: "'language' and a non-empty 'texts' array are required." }, 400);
  }

  // Guard against an unbounded batch turning into a runaway request.
  const capped = texts.slice(0, 200).map((t) => String(t));

  const prompt =
    `Translate each of the following user-interface strings for a point-of-sale ` +
    `business application into ${language}. Keep each translation short and ` +
    `natural for a business software interface. Preserve placeholders, numbers, ` +
    `and punctuation. Respond with ONLY a JSON array of strings, in the same ` +
    `order as the input, with no commentary or markdown fences.\n\n` +
    `${JSON.stringify(capped)}`;

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 4096,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return json({ error: "Could not reach the translation service." }, 502);
  }

  if (!anthropicResponse.ok) {
    const detail = await anthropicResponse.text();
    return json({ error: `Translation service error: ${detail}` }, 502);
  }

  const data = (await anthropicResponse.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const raw = data.content?.find((b) => b.type === "text")?.text ?? "[]";

  let translations: string[];
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    translations = JSON.parse(match ? match[0] : raw);
    if (!Array.isArray(translations)) throw new Error("not an array");
  } catch {
    return json({ error: "Could not parse the translation response." }, 502);
  }

  return json({ translations });
};
