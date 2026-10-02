import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) throw new Error("POSTGRES_URL_NON_POOLING ausente");
const sql = postgres(url, { ssl: "require", max: 1 });

await sql`create table if not exists public._migracoes (nome text primary key, aplicada_em timestamptz default now())`;
const dir = path.join(process.cwd(), "supabase/migrations");
for (const nome of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const [ja] = await sql`select 1 from public._migracoes where nome = ${nome}`;
  if (ja) { console.log(`= ${nome}`); continue; }
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(path.join(dir, nome), "utf8"));
    await tx`insert into public._migracoes (nome) values (${nome})`;
  });
  console.log(`+ ${nome}`);
}
await sql.end();
