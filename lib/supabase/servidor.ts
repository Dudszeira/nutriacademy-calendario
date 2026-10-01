import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function clienteServidor() {
  const loja = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseChave, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => loja.set(name, value, options)); } catch { /* Server Component: o proxy renova */ }
      },
    },
  });
}

/** Cliente com sessão válida, ou null. Use no início de toda Server Action do admin. */
export async function clienteAutenticado() {
  const sb = await clienteServidor();
  const { data } = await sb.auth.getUser();
  return data.user ? sb : null;
}
