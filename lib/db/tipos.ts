export type Categoria = { id: string; nome: string; cor: string };
export type Professor = { id: string; nome: string; titulo: string | null; slug: string; fotoPath: string | null };
export type Aula = { id: string; titulo: string; inicio: Date; duracaoMin: number; professor: Professor; categoria: Categoria };
