import { z } from "zod";

function dataExiste(s: string) {
  const [a, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Texto opcional de formulário: apara e transforma vazio em null. */
const textoOpcional = (max: number, msg: string) =>
  z.string().trim().max(max, msg).optional().transform((v) => v || null);

export const aulaSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe o título (mín. 3 letras)").max(160, "Título muito longo"),
    descricao: textoOpcional(600, "Descrição muito longa (máx. 600)"),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").refine(dataExiste, "Data inválida"),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
    duracaoMin: z.coerce.number().int("Use minutos inteiros").min(15, "Mínimo 15 minutos").max(600, "Máximo 10 horas"),
    professorId: z.uuid("Escolha o professor(a)"),
    nomeExibicao: textoOpcional(80, "Máx. 80 caracteres"),
    secaoId: z.uuid("Escolha a seção"),
    imersaoId: z.union([z.uuid("Imersão inválida"), z.literal("")]).optional().transform((v) => v || null),
    numeroNaImersao: z.string().optional(),
    imagemPath: z.string().optional().transform((v) => v || null),
  })
  .transform((a, ctx) => {
    if (!a.imersaoId) return { ...a, numeroNaImersao: null };
    const n = Number(a.numeroNaImersao);
    if (!a.numeroNaImersao || !Number.isInteger(n) || n < 1 || n > 50) {
      ctx.addIssue({ code: "custom", path: ["numeroNaImersao"], message: "Informe o nº da aula na imersão (1 a 50)" });
      return z.NEVER;
    }
    return { ...a, numeroNaImersao: n };
  });

export const professorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  fotoPath: z.string().optional().transform((v) => v || null),
});

export const secaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(40),
  estilo: z.enum(["destaque", "compacto"], "Escolha o estilo"),
  acento: z.enum(["ouro", "teal"], "Escolha o acento"),
  ordem: z.coerce.number().int().min(0, "Use 0 a 99").max(99, "Use 0 a 99"),
  logoPath: z.string().optional().transform((v) => v || null),
});

export const imersaoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome").max(80),
  secaoId: z.uuid("Escolha a seção"),
  exibirNome: z.string().optional().transform((v) => v === "on" || v === "true"),
});

export function slugify(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
