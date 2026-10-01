import { FUSO } from "./datas";

export type EventoAgenda = { id: string; titulo: string; inicio: Date; duracaoMin: number; descricao: string };

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fimDe = (ev: EventoAgenda) => new Date(ev.inicio.getTime() + ev.duracaoMin * 60_000);
const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function dobrar(linha: string): string {
  if (linha.length <= 75) return linha;
  const partes = [linha.slice(0, 75)];
  for (let i = 75; i < linha.length; i += 74) partes.push(" " + linha.slice(i, i + 74));
  return partes.join("\r\n");
}

export function gerarIcs(ev: EventoAgenda, agora: Date = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriAcademy//Calendario//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@calendario.escolanutriacademy.com.br`,
    `DTSTAMP:${utc(agora)}`,
    `DTSTART:${utc(ev.inicio)}`,
    `DTEND:${utc(fimDe(ev))}`,
    `SUMMARY:${escapar(ev.titulo)}`,
    `DESCRIPTION:${escapar(ev.descricao)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

export function urlGoogleAgenda(ev: EventoAgenda): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.titulo,
    dates: `${utc(ev.inicio)}/${utc(fimDe(ev))}`,
    details: ev.descricao,
    ctz: FUSO,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
