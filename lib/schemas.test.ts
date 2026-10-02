import { describe, expect, test } from "vitest";
import { aulaSchema, imersaoSchema, professorSchema, secaoSchema, slugify } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";
const aulaOk = { titulo: "Nutrição no Futebol", data: "2026-09-24", hora: "19:00", duracaoMin: "60", professorId: UUID, secaoId: UUID };

describe("aulaSchema", () => {
  test("aceita aula válida e converte duração; opcionais vazios viram null", () => {
    const r = aulaSchema.parse({ ...aulaOk, descricao: "", nomeExibicao: "", imersaoId: "", numeroNaImersao: "", imagemPath: "" });
    expect(r.duracaoMin).toBe(60);
    expect(r).toMatchObject({ descricao: null, nomeExibicao: null, imersaoId: null, numeroNaImersao: null, imagemPath: null });
  });
  test.each([
    ["titulo", "ab"], ["data", "2026-02-31"], ["data", "24/09/2026"], ["hora", "24:00"],
    ["duracaoMin", "10"], ["duracaoMin", "601"], ["professorId", ""], ["secaoId", "x"],
  ])("rejeita %s = %s", (campo, valor) => {
    expect(aulaSchema.safeParse({ ...aulaOk, [campo]: valor }).success).toBe(false);
  });
  test("aula de imersão exige número", () => {
    const r = aulaSchema.safeParse({ ...aulaOk, imersaoId: UUID2, numeroNaImersao: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["numeroNaImersao"]);
  });
  test("aula de imersão com número é aceita", () => {
    expect(aulaSchema.parse({ ...aulaOk, imersaoId: UUID2, numeroNaImersao: "3" }).numeroNaImersao).toBe(3);
  });
  test("número sem imersão é descartado", () => {
    expect(aulaSchema.parse({ ...aulaOk, numeroNaImersao: "4" }).numeroNaImersao).toBeNull();
  });
  test("descrição e nome de exibição são aparados", () => {
    const r = aulaSchema.parse({ ...aulaOk, descricao: "  Texto  ", nomeExibicao: " Dra. Samira Lima " });
    expect(r.descricao).toBe("Texto");
    expect(r.nomeExibicao).toBe("Dra. Samira Lima");
  });
});

describe("professorSchema", () => {
  test("foto vazia vira null e não tem mais título", () => {
    expect(professorSchema.parse({ nome: "Samira Lima", slug: "samira-lima", fotoPath: "" }))
      .toEqual({ nome: "Samira Lima", slug: "samira-lima", fotoPath: null });
  });
  test("slug inválido", () => {
    expect(professorSchema.safeParse({ nome: "Samira", slug: "Samira Lima" }).success).toBe(false);
  });
});

describe("secaoSchema", () => {
  const ok = { nome: "NutriAcademy PRO", estilo: "compacto", acento: "teal", ordem: "30", logoPath: "" };
  test("aceita seção válida", () => {
    expect(secaoSchema.parse(ok)).toEqual({ nome: "NutriAcademy PRO", estilo: "compacto", acento: "teal", ordem: 30, logoPath: null });
  });
  test.each([["estilo", "grade"], ["acento", "rosa"], ["ordem", "-1"], ["nome", "x"]])("rejeita %s = %s", (c, v) => {
    expect(secaoSchema.safeParse({ ...ok, [c]: v }).success).toBe(false);
  });
});

describe("imersaoSchema", () => {
  test("checkbox 'on' vira true e ausência vira false", () => {
    expect(imersaoSchema.parse({ nome: "Imersão Samira", secaoId: UUID, exibirNome: "on" }).exibirNome).toBe(true);
    expect(imersaoSchema.parse({ nome: "Imersão Samira", secaoId: UUID }).exibirNome).toBe(false);
  });
});

describe("slugify", () => {
  test("remove acentos, caixa e pontuação", () => {
    expect(slugify("  Profª. Ana Conceição! ")).toBe("prof-ana-conceicao");
    expect(slugify("fred estevam")).toBe("fred-estevam");
  });
});
