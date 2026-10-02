import type { Aula, Imersao, Secao } from "./db/tipos";

export type Bloco = { secao: Secao; avulsas: Aula[]; imersoes: { imersao: Imersao; aulas: Aula[] }[] };

const porData = (x: Aula, y: Aula) => x.inicio.getTime() - y.inicio.getTime();

/** Organiza as aulas do mês na ordem da página: seção (por `ordem`) → avulsas por data → imersões por nº. */
export function montarMes(aulas: Aula[], secoes: Secao[]): Bloco[] {
  return [...secoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((secao) => {
      const daSecao = aulas.filter((a) => a.secao.id === secao.id);
      const avulsas = daSecao.filter((a) => !a.imersao).sort(porData);
      const grupos = new Map<string, { imersao: Imersao; aulas: Aula[] }>();
      for (const a of daSecao.filter((x) => x.imersao).sort(porData)) {
        const g = grupos.get(a.imersao!.id) ?? { imersao: a.imersao!, aulas: [] };
        g.aulas.push(a);
        grupos.set(a.imersao!.id, g);
      }
      const imersoes = [...grupos.values()].map((g) => ({
        ...g,
        aulas: g.aulas.sort((x, y) => (x.numeroNaImersao ?? 0) - (y.numeroNaImersao ?? 0)),
      }));
      return { secao, avulsas, imersoes };
    })
    .filter((b) => b.avulsas.length || b.imersoes.length);
}
