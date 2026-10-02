import type { SupabaseClient } from "@supabase/supabase-js";
import { anoMesDe, limitesDoMes, type AnoMes } from "@/lib/datas";
import type { Aula, Imersao, Professor, Secao } from "./tipos";

const COLS_SECAO = "id, nome, estilo, acento, ordem, logo_path";
const COLS_IMERSAO = "id, nome, exibir_nome, secao_id";
const SELECT_AULA = `id, titulo, descricao, inicio, duracao_min, nome_exibicao, numero_na_imersao, imagem_path,
  professor:professores!inner(id, nome, slug, foto_path),
  secao:secoes!inner(${COLS_SECAO}),
  imersao:imersoes(${COLS_IMERSAO})`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LinhaProfessor = { id: string; nome: string; slug: string; foto_path: string | null };
type LinhaSecao = { id: string; nome: string; estilo: Secao["estilo"]; acento: Secao["acento"]; ordem: number; logo_path: string | null };
type LinhaImersao = { id: string; nome: string; exibir_nome: boolean; secao_id: string };
type LinhaAula = {
  id: string; titulo: string; descricao: string | null; inicio: string; duracao_min: number;
  nome_exibicao: string | null; numero_na_imersao: number | null; imagem_path: string | null;
  professor: LinhaProfessor; secao: LinhaSecao; imersao: LinhaImersao | null;
};

const paraProfessor = (p: LinhaProfessor): Professor => ({ id: p.id, nome: p.nome, slug: p.slug, fotoPath: p.foto_path });
const paraSecao = (s: LinhaSecao): Secao => ({ id: s.id, nome: s.nome, estilo: s.estilo, acento: s.acento, ordem: s.ordem, logoPath: s.logo_path });
const paraImersao = (i: LinhaImersao): Imersao => ({ id: i.id, nome: i.nome, exibirNome: i.exibir_nome, secaoId: i.secao_id });
const paraAula = (a: LinhaAula): Aula => ({
  id: a.id, titulo: a.titulo, descricao: a.descricao, inicio: new Date(a.inicio), duracaoMin: a.duracao_min,
  professor: paraProfessor(a.professor), nomeExibicao: a.nome_exibicao, secao: paraSecao(a.secao),
  imersao: a.imersao ? paraImersao(a.imersao) : null, numeroNaImersao: a.numero_na_imersao, imagemPath: a.imagem_path,
});

function falhar(error: { message: string } | null): void {
  if (error) throw new Error(`Supabase: ${error.message}`);
}

/** Como o nome do professor aparece nesta aula ("Dra. Samira Lima"); padrão: o nome cadastrado. */
export const nomeExibicao = (a: Pick<Aula, "nomeExibicao" | "professor">) => a.nomeExibicao ?? a.professor.nome;

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

export async function aulasDaImersao(sb: SupabaseClient, imersaoId: string): Promise<Aula[]> {
  if (!UUID.test(imersaoId)) return [];
  const { data, error } = await sb.from("aulas").select(SELECT_AULA).eq("imersao_id", imersaoId).order("numero_na_imersao");
  falhar(error);
  return (data as unknown as LinhaAula[]).map(paraAula);
}

export async function ultimoNomeExibicao(sb: SupabaseClient, professorId: string): Promise<string | null> {
  if (!UUID.test(professorId)) return null;
  const { data, error } = await sb.from("aulas").select("nome_exibicao").eq("professor_id", professorId)
    .not("nome_exibicao", "is", null).order("updated_at", { ascending: false }).limit(1);
  falhar(error);
  return data?.[0]?.nome_exibicao ?? null;
}

export async function professorPorSlug(sb: SupabaseClient, slug: string): Promise<Professor | null> {
  const { data, error } = await sb.from("professores").select("id, nome, slug, foto_path").eq("slug", slug).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function professorPorId(sb: SupabaseClient, id: string): Promise<Professor | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("professores").select("id, nome, slug, foto_path").eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraProfessor(data) : null;
}

export async function listarProfessores(sb: SupabaseClient): Promise<Professor[]> {
  const { data, error } = await sb.from("professores").select("id, nome, slug, foto_path").order("nome");
  falhar(error);
  return (data ?? []).map(paraProfessor);
}

export async function listarSecoes(sb: SupabaseClient): Promise<Secao[]> {
  const { data, error } = await sb.from("secoes").select(COLS_SECAO).order("ordem");
  falhar(error);
  return ((data ?? []) as LinhaSecao[]).map(paraSecao);
}

export async function secaoPorId(sb: SupabaseClient, id: string): Promise<Secao | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("secoes").select(COLS_SECAO).eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraSecao(data as LinhaSecao) : null;
}

export async function listarImersoes(sb: SupabaseClient): Promise<Imersao[]> {
  const { data, error } = await sb.from("imersoes").select(COLS_IMERSAO).order("created_at", { ascending: false });
  falhar(error);
  return ((data ?? []) as LinhaImersao[]).map(paraImersao);
}

export async function imersaoPorId(sb: SupabaseClient, id: string): Promise<Imersao | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await sb.from("imersoes").select(COLS_IMERSAO).eq("id", id).maybeSingle();
  falhar(error);
  return data ? paraImersao(data as LinhaImersao) : null;
}

export async function contarAulas(sb: SupabaseClient, coluna: "professor_id" | "secao_id" | "imersao_id", id: string): Promise<number> {
  const { count, error } = await sb.from("aulas").select("id", { count: "exact", head: true }).eq(coluna, id);
  falhar(error);
  return count ?? 0;
}
