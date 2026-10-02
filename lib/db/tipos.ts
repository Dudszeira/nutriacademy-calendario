export type Estilo = "destaque" | "compacto";
export type Acento = "ouro" | "teal";
export type Secao = { id: string; nome: string; estilo: Estilo; acento: Acento; ordem: number; logoPath: string | null };
export type Imersao = { id: string; nome: string; exibirNome: boolean; secaoId: string };
export type Professor = { id: string; nome: string; slug: string; fotoPath: string | null };
export type Aula = {
  id: string;
  titulo: string;
  descricao: string | null;
  inicio: Date;
  duracaoMin: number;
  professor: Professor;
  nomeExibicao: string | null;
  secao: Secao;
  imersao: Imersao | null;
  numeroNaImersao: number | null;
  imagemPath: string | null;
};
