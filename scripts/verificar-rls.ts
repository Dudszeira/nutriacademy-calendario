import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const chavePublica = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
const anon = createClient(url, chavePublica, { auth: { persistSession: false } });

const leitura = await anon.from("aulas").select("id").limit(1);
assert.equal(leitura.error, null, "anon deve conseguir ler aulas");

const ins = await anon.from("secoes").insert({ nome: "rls-teste", estilo: "destaque" });
assert.ok(ins.error, "anon NÃO pode inserir");

const upd = await anon.from("secoes").update({ ordem: 1 }).neq("id", "00000000-0000-0000-0000-000000000000").select();
assert.equal(upd.data?.length ?? 0, 0, "anon NÃO pode alterar (0 linhas)");

const eq = await anon.from("equipe").select("user_id");
assert.equal(eq.data?.length ?? 0, 0, "anon NÃO pode listar a equipe");

const up = await anon.storage.from("fotos").upload(`rls-${Date.now()}.webp`, new Blob(["x"], { type: "image/webp" }));
assert.ok(up.error, "anon NÃO pode enviar fotos");

const logado = createClient(url, chavePublica, { auth: { persistSession: false } });
const { error: eLogin } = await logado.auth.signInWithPassword({ email: process.env.E2E_EMAIL!, password: process.env.E2E_SENHA! });
assert.equal(eLogin, null, "conta da equipe deve logar");
const ok = await logado.from("secoes").insert({ nome: `rls-${Date.now()}`, estilo: "destaque" }).select("id").single();
assert.equal(ok.error, null, "equipe pode inserir");
await logado.from("secoes").delete().eq("id", ok.data!.id);

console.log("RLS OK");
