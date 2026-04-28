// Generate a post draft from a pipeline idea using Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  idea: string;
  hook?: string | null;
  channel?: string | null;
  platform?: string | null;
  pillar?: string | null;
  format?: string | null;
  notes?: string | null;
  tone?: string | null;
}

const PLATFORM_GUIDE: Record<string, string> = {
  "X (Twitter)": "Max 280 chars per tweet. If longer, format as a numbered thread (1/, 2/, …). Punchy hook first line. Minimal hashtags.",
  Instagram: "Caption-style. Strong hook in first line (visible before 'more'). Short paragraphs, line breaks for rhythm. 3–8 relevant hashtags at end.",
  Telegram: "Conversational broadcast tone. Markdown allowed (*bold*, _italic_). Can be longer-form. End with a clear CTA or question.",
  YouTube: "Video description. Hook in first 2 lines. Include chapters/timestamps placeholder, links section, and 3–5 hashtags.",
  Blog: "Long-form. Include H2/H3 headings, intro, 3–5 body sections, conclusion. Markdown.",
  WhatsApp: "Short broadcast message. Plain text, friendly, one clear CTA.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    if (!body?.idea || typeof body.idea !== "string") {
      return new Response(JSON.stringify({ error: "idea is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformGuide = body.platform ? PLATFORM_GUIDE[body.platform] ?? "" : "";

    const system = `You are a senior social media copywriter for Duzza. Write publish-ready post drafts that match the target platform's native conventions. No preamble, no explanations — output ONLY the post body. Keep the brand voice clear, confident, useful. Avoid emoji spam.`;

    const user = [
      `IDEA: ${body.idea}`,
      body.hook ? `HOOK: ${body.hook}` : null,
      body.channel ? `BRAND/CHANNEL: ${body.channel}` : null,
      body.platform ? `PLATFORM: ${body.platform}` : null,
      body.pillar ? `PILLAR: ${body.pillar}` : null,
      body.format ? `FORMAT: ${body.format}` : null,
      body.notes ? `NOTES: ${body.notes}` : null,
      body.tone ? `TONE: ${body.tone}` : null,
      platformGuide ? `\nPLATFORM RULES:\n${platformGuide}` : null,
      `\nWrite the draft now.`,
    ].filter(Boolean).join("\n");

    const model = "google/gemini-3-flash-preview";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const draft = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ draft, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-draft error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
