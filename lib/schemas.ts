import { z } from "zod";

function dataExiste(s: string) {
  const [a, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const aulaSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título (mín. 3 letras)").max(160, "Título muito longo"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").refine(dataExiste, "Data inválida"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida"),
  duracaoMin: z.coerce.number().int("Use minutos inteiros").min(15, "Mínimo 15 minutos").max(600, "Máximo 10 horas"),
  professorId: z.uuid("Escolha o professor"),
  categoriaId: z.uuid("Escolha a categoria"),
});

export const professorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  titulo: z.string().trim().max(20, "Máx. 20 caracteres").optional().transform((v) => v || null),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  fotoPath: z.string().optional().transform((v) => v || null),
});

export const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(40),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida (use #RRGGBB)"),
});

export function slugify(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
