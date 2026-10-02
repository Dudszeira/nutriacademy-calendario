import { expect, test } from "vitest";
import type { Aula, Imersao, Secao } from "./db/tipos";
import { montarMes } from "./montar-mes";

const sec = (id: string, ordem: number, estilo: Secao["estilo"] = "destaque"): Secao =>
  ({ id, nome: id, estilo, acento: estilo === "compacto" ? "teal" : "ouro", ordem, logoPath: null });
const labs = sec("labs", 10), onfire = sec("onfire", 20), pro = sec("pro", 30, "compacto"), curadoria = sec("curadoria", 40);
const imersao: Imersao = { id: "im", nome: "Imersão Samira", exibirNome: false, secaoId: "labs" };
const prof = { id: "p", nome: "Samira Lima", slug: "samira-lima", fotoPath: null };

let n = 0;
const aula = (dia: number, secao: Secao, extra: Partial<Aula> = {}): Aula => ({
  id: `a${++n}`, titulo: `t${n}`, descricao: null, inicio: new Date(Date.UTC(2026, 9, dia, 22)), duracaoMin: 60,
  professor: prof, nomeExibicao: null, secao, imersao: null, numeroNaImersao: null, imagemPath: null, ...extra,
});

test("ordena seções por ordem, avulsas por data, imersão logo após as avulsas da sua seção, por número", () => {
  const aulas = [
    aula(26, pro), aula(5, pro),
    aula(29, onfire),
    aula(21, labs, { imersao, numeroNaImersao: 3 }),
    aula(19, labs, { imersao, numeroNaImersao: 1 }),
    aula(13, labs),
    aula(20, labs, { imersao, numeroNaImersao: 2 }),
  ];
  const blocos = montarMes(aulas, [pro, curadoria, onfire, labs]);
  expect(blocos.map((b) => b.secao.id)).toEqual(["labs", "onfire", "pro"]);
  expect(blocos[0].avulsas.map((a) => a.inicio.getUTCDate())).toEqual([13]);
  expect(blocos[0].imersoes).toHaveLength(1);
  expect(blocos[0].imersoes[0].imersao.id).toBe("im");
  expect(blocos[0].imersoes[0].aulas.map((a) => a.numeroNaImersao)).toEqual([1, 2, 3]);
  expect(blocos[2].avulsas.map((a) => a.inicio.getUTCDate())).toEqual([5, 26]);
});

test("seção sem aulas no mês é omitida; mês vazio dá lista vazia", () => {
  expect(montarMes([], [labs, pro])).toEqual([]);
  expect(montarMes([aula(3, pro)], [labs, pro]).map((b) => b.secao.id)).toEqual(["pro"]);
});

test("seção que só tem imersão aparece com avulsas vazias", () => {
  const b = montarMes([aula(19, labs, { imersao, numeroNaImersao: 1 })], [labs]);
  expect(b).toHaveLength(1);
  expect(b[0].avulsas).toEqual([]);
  expect(b[0].imersoes[0].aulas).toHaveLength(1);
});
