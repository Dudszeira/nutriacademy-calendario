import { describe, expect, test } from "vitest";
import { aulaSchema, categoriaSchema, professorSchema, slugify } from "./schemas";

const UUID = "11111111-1111-4111-8111-111111111111";
const aulaOk = { titulo: "Nutrição no Futebol", data: "2026-09-24", hora: "19:00", duracaoMin: "60", professorId: UUID, categoriaId: UUID };

describe("aulaSchema", () => {
  test("aceita aula válida e converte duração", () => {
    const r = aulaSchema.parse(aulaOk);
    expect(r.duracaoMin).toBe(60);
  });
  test.each([
    ["titulo", "ab"], ["data", "2026-02-31"], ["data", "24/09/2026"], ["hora", "24:00"],
    ["duracaoMin", "10"], ["duracaoMin", "601"], ["professorId", ""], ["categoriaId", "x"],
  ])("rejeita %s = %s", (campo, valor) => {
    expect(aulaSchema.safeParse({ ...aulaOk, [campo]: valor }).success).toBe(false);
  });
});

describe("professorSchema", () => {
  test("título vazio vira null", () => {
    expect(professorSchema.parse({ nome: "Samira Lima", titulo: "", slug: "samira-lima", fotoPath: "" }))
      .toEqual({ nome: "Samira Lima", titulo: null, slug: "samira-lima", fotoPath: null });
  });
  test("slug inválido", () => {
    expect(professorSchema.safeParse({ nome: "Samira", slug: "Samira Lima" }).success).toBe(false);
  });
});

describe("categoriaSchema", () => {
  test("cor precisa ser hex de 6 dígitos", () => {
    expect(categoriaSchema.safeParse({ nome: "Módulo", cor: "#6A6758" }).success).toBe(true);
    expect(categoriaSchema.safeParse({ nome: "Módulo", cor: "red" }).success).toBe(false);
  });
});

describe("slugify", () => {
  test("remove acentos, caixa e pontuação", () => {
    expect(slugify("  Profª. Ana Conceição! ")).toBe("prof-ana-conceicao");
    expect(slugify("fred estevam")).toBe("fred-estevam");
  });
});
