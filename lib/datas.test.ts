import { describe, expect, test } from "vitest";
import {
  anoMesDe, caminhoDoMes, formatarDataHora, jaRealizada, limitesDoMes, mesAnterior,
  mesAtual, nomeDoMes, paraInstante, parseAnoMes, partesDoCard, partesLocais, proximoMes, somarDias,
} from "./datas";

describe("limitesDoMes", () => {
  test("setembro/2026 começa 00:00 em SP (03:00Z) e termina no início de outubro", () => {
    const { inicio, fim } = limitesDoMes({ ano: 2026, mes: 9 });
    expect(inicio.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });
  test("dezembro vira o ano", () => {
    expect(limitesDoMes({ ano: 2026, mes: 12 }).fim.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("anoMesDe", () => {
  test("23h30 do dia 30/09 em SP (02:30Z de 01/10) pertence a setembro", () => {
    expect(anoMesDe(new Date("2026-10-01T02:30:00Z"))).toEqual({ ano: 2026, mes: 9 });
  });
  test("31/12 às 23h em SP pertence a dezembro do mesmo ano", () => {
    expect(anoMesDe(new Date("2027-01-01T02:00:00Z"))).toEqual({ ano: 2026, mes: 12 });
  });
  test("mesAtual usa o relógio de SP", () => {
    expect(mesAtual(new Date("2026-10-01T02:59:00Z"))).toEqual({ ano: 2026, mes: 9 });
    expect(mesAtual(new Date("2026-10-01T03:00:00Z"))).toEqual({ ano: 2026, mes: 10 });
  });
});

describe("navegação de mês", () => {
  test("próximo e anterior atravessam o ano", () => {
    expect(proximoMes({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 });
    expect(mesAnterior({ ano: 2026, mes: 1 })).toEqual({ ano: 2025, mes: 12 });
  });
  test("caminhoDoMes usa dois dígitos", () => {
    expect(caminhoDoMes({ ano: 2026, mes: 9 })).toBe("/2026/09");
  });
  test("nomeDoMes", () => {
    expect(nomeDoMes(9)).toBe("Setembro");
    expect(nomeDoMes(3)).toBe("Março");
  });
});

describe("parseAnoMes", () => {
  test("aceita AAAA/MM válidos", () => {
    expect(parseAnoMes("2026", "09")).toEqual({ ano: 2026, mes: 9 });
    expect(parseAnoMes("2026", "12")).toEqual({ ano: 2026, mes: 12 });
  });
  test.each([["2026", "13"], ["2026", "00"], ["2026", "9"], ["abc", "09"], ["1999", "01"], ["2101", "01"], ["2026", "09x"]])(
    "rejeita %s/%s", (a, m) => expect(parseAnoMes(a, m)).toBeNull(),
  );
});

describe("formatação", () => {
  test("hora cheia sem minutos, convertida para SP", () => {
    expect(formatarDataHora(new Date("2026-09-15T22:00:00Z"))).toBe("15/09 · 19h");
  });
  test("hora com minutos", () => {
    expect(formatarDataHora(new Date("2026-09-15T22:30:00Z"))).toBe("15/09 · 19h30");
  });
  test("partesDoCard", () => {
    expect(partesDoCard(new Date("2026-09-15T22:00:00Z"))).toEqual({ dia: "15", mesCurto: "SET", semana: "ter", hora: "19h" });
  });
});

describe("jaRealizada", () => {
  const inicio = new Date("2026-09-15T22:00:00Z");
  test("durante a aula ainda não foi realizada", () => {
    expect(jaRealizada(inicio, 60, new Date("2026-09-15T22:59:00Z"))).toBe(false);
  });
  test("ao terminar foi realizada", () => {
    expect(jaRealizada(inicio, 60, new Date("2026-09-15T23:00:00Z"))).toBe(true);
  });
});

describe("conversões do formulário", () => {
  test("paraInstante interpreta como horário de SP", () => {
    expect(paraInstante("2026-09-15", "19:00").toISOString()).toBe("2026-09-15T22:00:00.000Z");
  });
  test("partesLocais é o inverso", () => {
    expect(partesLocais(new Date("2026-10-01T02:30:00Z"))).toEqual({ data: "2026-09-30", hora: "23:30" });
  });
  test("somarDias atravessa mês e ano", () => {
    expect(somarDias("2026-09-28", 7)).toBe("2026-10-05");
    expect(somarDias("2026-12-29", 7)).toBe("2027-01-05");
  });
});
