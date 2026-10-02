import { createClient } from "@supabase/supabase-js";

const [email, senha] = process.argv.slice(2);
if (!email || !senha || senha.length < 12) {
  console.error("Uso: npm run usuario:criar -- <email> <senha com 12+ caracteres>");
  process.exit(1);
}
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
  { auth: { persistSession: false } },
);
const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
const { error: e2 } = await admin.from("equipe").insert({ user_id: data.user.id });
if (e2) throw e2;
console.log(`Conta criada e adicionada à equipe: ${email}`);
