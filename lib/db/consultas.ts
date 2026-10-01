import type { SupabaseClient } from "@supabase/supabase-js";
import { anoMesDe, limitesDoMes, type AnoMes } from "@/lib/datas";
import type { Aula, Categoria, Professor } from "./tipos";

const SELECT_AULA = "id, titulo, inicio, duracao_min, professor:professores!inner(id, nome, titulo, slug, foto_path), categoria:categorias!inner(id, nome, cor)";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinhaProfessor = { id: string; nome: string; titulo: string | null; slug: string; foto_path: string | null };
type LinhaAula = { id: string; titulo: string; inicio: string; duracao_min: number; professor: LinhaProfessor; categoria: Categoria };

const paraProfessor = (p: LinhaProfessor): Professor => ({ id: p.id, nome: p.nome, titulo: p.titulo, slug: p.slug, fotoPath: p.foto_path });
const paraAula = (a: LinhaAula): Aula => ({
  id: a.id, titulo: a.titulo, inicio: new Date(a.inicio), duracaoMin: a.duracao_min,
  professor: paraProfessor(a.professor), categoria: a.categoria,
});

function falhar(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export const nomeExibicao = (p: Professor) => (p.titulo ? `${p.titulo} ${p.nome}` : p.nome);

export async function aulasDoMes(sb: SupabaseClient, am: AnoMes): Promise<Aula[]> {
  const { inicio, fim } = limitesDoMes(am);
  const { data, error } = await sb.from("aulas").select(SELECT_AULA)
    .gte("inicio", inicio.toISOString()).lt("inicio", fim.toISOString()).order("inicio");
  falhar(error);
  return (data as unknown as LinhaAula[]).map(paraAula);
}

export async function mesVizinhoComAula(sb: SupabaseClient, am: AnoMes, dir: "anterior" | "proximo"): Promise<AnoMes | null> {
  const { inicio, fim } = limitesDoMes(am);
  const q = sb.from("aulas").select("inicio").limit(1);
  const { data, error } = dir === "anterior"
    ? await q.lt("inicio", inicio.toISOString()).order("inicio", { ascending: false })
    : await q.gte("inicio", fim.toISOString()).order("inicio", { ascending: true });
  falhar(error);
  return data?.[0] ? anoMesDe(new Date(data[0].inicio)) : null;
}

export async function aulaPorId(sb: SupabaseClient, id: string): Promise<Aula | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("aulas").select(SELECT_AULA).eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraAula(data as unknown as LinhaAula) : null;
}

export async function aulasDoProfessor(sb: SupabaseClient, professorId: string): Promise<Aula[]> {
  const { data, error } = await sb.from("aulas").select(SELECT_AULA).eq("professor_id", professorId).order("inicio");
  falhar(error);
  return (data as unknown as LinhaAula[]).map(paraAula);
}

export async function professorPorSlug(sb: SupabaseClient, slug: string): Promise<Professor | null> {
  const { data, error } = await sb.from("professores").select("*").eq("slug", slug).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function professorPorId(sb: SupabaseClient, id: string): Promise<Professor | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("professores").select("*").eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function listarProfessores(sb: SupabaseClient): Promise<Professor[]> {
  const { data, error } = await sb.from("professores").select("*").order("nome");
  falhar(error);
  return (data ?? []).map(paraProfessor);
}

export async function listarCategorias(sb: SupabaseClient): Promise<Categoria[]> {
  const { data, error } = await sb.from("categorias").select("id, nome, cor").order("nome");
  falhar(error);
  return data ?? [];
}

export async function categoriaPorId(sb: SupabaseClient, id: string): Promise<Categoria | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("categorias").select("id, nome, cor").eq("id", id).maybeSingle();
  falhar(error);
  return data;
}

export async function contarAulas(sb: SupabaseClient, coluna: "professor_id" | "categoria_id", id: string): Promise<number> {
  const { count, error } = await sb.from("aulas").select("id", { count: "exact", head: true }).eq(coluna, id);
  falhar(error);
  return count ?? 0;
}
