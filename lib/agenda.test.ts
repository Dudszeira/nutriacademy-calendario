import { describe, expect, test } from "vitest";
import { gerarIcs, urlGoogleAgenda, type EventoAgenda } from "./agenda";

const ev: EventoAgenda = {
  id: "11111111-1111-4111-8111-111111111111",
  titulo: "Nutrição, Futebol; e Alto Rendimento",
  inicio: new Date("2026-09-24T22:00:00Z"),
  duracaoMin: 90,
  descricao: "Com Guilherme Oliveira\nNutriAcademy",
};

describe("gerarIcs", () => {
  const ics = gerarIcs(ev, new Date("2026-09-01T12:00:00Z"));
  test("usa CRLF e envelopa VCALENDAR/VEVENT", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nBEGIN:VEVENT\r\n");
  });
  test("horários em UTC e fim = início + duração", () => {
    expect(ics).toContain("DTSTART:20260924T220000Z");
    expect(ics).toContain("DTEND:20260924T233000Z");
    expect(ics).toContain("DTSTAMP:20260901T120000Z");
  });
  test("UID estável e texto escapado (após desdobrar linhas)", () => {
    const ics = gerarIcs(ev).replace(/\r\n /g, "");
    expect(ics).toContain(`UID:${ev.id}@calendario.escolanutriacademy.com.br`);
    expect(ics).toContain("SUMMARY:Nutrição\\, Futebol\\; e Alto Rendimento");
    expect(ics).toContain("DESCRIPTION:Com Guilherme Oliveira\\nNutriAcademy");
  });
  test("dobra linhas longas em até 75 caracteres", () => {
    const longo = gerarIcs({ ...ev, titulo: "A".repeat(200) });
    for (const linha of longo.split("\r\n")) expect(linha.length).toBeLessThanOrEqual(75);
    expect(longo).toContain("\r\n A");
  });
});

describe("urlGoogleAgenda", () => {
  test("monta link de template com datas UTC", () => {
    const url = new URL(urlGoogleAgenda(ev));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(ev.titulo);
    expect(url.searchParams.get("dates")).toBe("20260924T220000Z/20260924T233000Z");
    expect(url.searchParams.get("ctz")).toBe("America/Sao_Paulo");
  });
});
