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
    const { pipeline_id, article_id, channel, platform, content, date } = body ?? {};

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

    const contentStr = String(content);
    let resultId: string;

    if (pipeline_id) {
      const { data, error } = await supabase
        .from('pipeline')
        .update({
          hook: contentStr.slice(0, 280),
          status: 'Polishing',
          notes: 'From Polisher',
        })
        .eq('id', pipeline_id)
        .select('id')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      resultId = data.id;
    } else {
      const { data, error } = await supabase
        .from('pipeline')
        .insert({
          idea: contentStr.slice(0, 500),
          channel: channel ?? null,
          platform: platform ?? null,
          hook: contentStr.slice(0, 280),
          date,
          status: 'Drafting',
          notes: 'From Polisher',
        })
        .select('id')
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      resultId = data.id;
    }

    // Best-effort: mark polisher_queue entry done
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

    return new Response(JSON.stringify({ success: true, pipeline_id: data.id }), {
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
