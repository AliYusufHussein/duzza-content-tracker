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
    const { title, content, channel, platform, date } = body ?? {};

    if (!title && !content) {
      return new Response(JSON.stringify({ error: 'title or content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const ideaSource = String(title ?? content ?? '');
    const idea = ideaSource.slice(0, 100);

    const pipelineInsert: Record<string, unknown> = {
      idea,
      channel: channel ?? null,
      platform: platform ?? null,
      status: 'Polishing',
      notes: 'From Polisher',
    };
    if (date) pipelineInsert.date = date;

    const { data: pipelineRow, error: pipelineErr } = await supabase
      .from('pipeline')
      .insert(pipelineInsert)
      .select('id')
      .single();

    if (pipelineErr) {
      return new Response(JSON.stringify({ error: pipelineErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (content) {
      const { error: draftErr } = await supabase
        .from('pipeline_drafts')
        .insert({
          pipeline_id: pipelineRow.id,
          body: String(content),
          source: 'polisher',
        });

      if (draftErr) {
        return new Response(JSON.stringify({ error: draftErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, pipeline_id: pipelineRow.id }), {
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
