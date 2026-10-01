import { z } from "zod";

export type Resultado<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; campos?: Record<string, string> };

export const SESSAO_EXPIRADA = "Sua sessão expirou ou você não tem permissão. Entre novamente.";

export function mensagemDoErroDb(e: { code?: string; message?: string }): string {
  switch (e.code) {
    case "23503": return "Não é possível excluir: ainda existem aulas ligadas a este registro.";
    case "23505": return "Já existe um registro com esse nome ou endereço (slug).";
    case "42501": return SESSAO_EXPIRADA;
    case "PGRST116": return "Registro não encontrado ou sessão expirada. Recarregue a página.";
    default: return "Não foi possível salvar. Tente novamente.";
  }
}

export function errosDeCampo(e: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of e.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !campos[k]) campos[k] = issue.message;
  }
  return campos;
}
