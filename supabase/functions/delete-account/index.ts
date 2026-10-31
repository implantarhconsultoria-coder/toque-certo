// Privileged endpoint: deploy ONLY to the Toque Certo Supabase project.
// Client callers never receive the service role key.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const allowedOrigins = new Set(['https://toque-certo-pi.vercel.app']);
function headers(origin: string | null) {
  const allowed = origin && allowedOrigins.has(origin) ? origin : 'https://toque-certo-pi.vercel.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const responseHeaders = headers(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders });
  if (req.method !== 'POST') return Response.json({ error: 'Método não permitido' }, { status: 405, headers: responseHeaders });
  if (origin && !allowedOrigins.has(origin)) {
    return Response.json({ error: 'Origem não autorizada' }, { status: 403, headers: responseHeaders });
  }
  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Sessão obrigatória' }, { status: 401, headers: responseHeaders });
    const body = await req.json();
    if (body?.confirm !== 'EXCLUIR') return Response.json({ error: 'Confirmação inválida' }, { status: 400, headers: responseHeaders });

    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !serviceRole) {
      return Response.json({ error: 'Configuração de servidor incompleta' }, { status: 503, headers: responseHeaders });
    }
    const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error: authError } = await client.auth.getUser(token);
    if (authError || !data.user) return Response.json({ error: 'Sessão inválida' }, { status: 401, headers: responseHeaders });
    const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await admin.auth.admin.deleteUser(data.user.id);
    if (error) return Response.json({ error: 'Não foi possível excluir a conta' }, { status: 500, headers: responseHeaders });
    return Response.json({ deleted: true }, { headers: responseHeaders });
  } catch {
    return Response.json({ error: 'Falha no processamento' }, { status: 500, headers: responseHeaders });
  }
});
