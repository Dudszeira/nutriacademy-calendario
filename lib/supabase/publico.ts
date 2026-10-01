import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function clientePublico() {
  return createClient(env.supabaseUrl, env.supabaseChave, { auth: { persistSession: false, autoRefreshToken: false } });
}
