import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header from client');
    const token = authHeader.replace('Bearer ', '').trim();

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized: ' + (userError?.message || 'No user found'));

    // Initialize admin client to bypass RLS for secure checks
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');
      
    if (!roles || roles.length === 0) throw new Error('Forbidden: You must be an admin to invite users.');

    const { email, role } = await req.json();

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: 'http://localhost:8080/?invite=true'
      }
    });
    if (inviteError) throw inviteError;

    const newUserId = inviteData.user.id;
    const actionLink = inviteData.properties?.action_link;

    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert({ user_id: newUserId, role });
    if (roleError) throw roleError;

    await supabaseAdmin.from('profiles').upsert({ id: newUserId, name: email.split('@')[0], presence: 'offline' });

    return new Response(JSON.stringify({ success: true, link: actionLink }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    // ALWAYS return 200 so the frontend can parse the error message instead of throwing a generic exception
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
