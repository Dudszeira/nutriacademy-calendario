import { expect, test } from "vitest";
import { agruparPorMes, separarPorStatus } from "./agrupar";

const a = (iso: string, duracaoMin = 60) => ({ inicio: new Date(iso), duracaoMin });

test("agrupa preservando a ordem recebida, no fuso de SP", () => {
  const g = agruparPorMes([a("2026-10-01T02:30:00Z"), a("2026-09-10T22:00:00Z"), a("2026-08-05T22:00:00Z")]);
  expect(g.map((x) => x.anoMes)).toEqual([{ ano: 2026, mes: 9 }, { ano: 2026, mes: 8 }]);
  expect(g[0].itens).toHaveLength(2);
});

test("separa próximas (asc) de realizadas (desc)", () => {
  const agora = new Date("2026-09-20T12:00:00Z");
  const { proximas, realizadas } = separarPorStatus(
    [a("2026-09-24T22:00:00Z"), a("2026-09-08T22:00:00Z"), a("2026-09-30T22:00:00Z"), a("2026-09-15T22:00:00Z")], agora,
  );
  expect(proximas.map((x) => x.inicio.getUTCDate())).toEqual([24, 30]);
  expect(realizadas.map((x) => x.inicio.getUTCDate())).toEqual([15, 8]);
});
