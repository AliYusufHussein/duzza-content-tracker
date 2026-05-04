import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { pipeline_id, article_id, channel, platform, content, date, source } = body ?? {};

    if (!content || !date) {
      return new Response(JSON.stringify({ error: 'content and date are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('calendar')
      .insert({
        date,
        channel: channel ?? null,
        platform: platform ?? null,
        content,
        status: 'Scheduled',
        source: source ?? 'polisher',
      })
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort: mark polisher_queue entry done if we can find it
    if (pipeline_id || article_id) {
      try {
        const q = supabase.from('polisher_queue').update({
          status: 'done',
          ...(article_id ? { article_id: String(article_id) } : {}),
        });
        if (article_id) {
          await q.eq('article_id', String(article_id));
        } else if (pipeline_id) {
          await q.eq('pipeline_id', pipeline_id);
        }
      } catch (_) { /* ignore */ }
    }

    return new Response(JSON.stringify({ success: true, calendar_id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
