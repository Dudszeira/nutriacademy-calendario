import { TZDate } from "@date-fns/tz";

export const FUSO = "America/Sao_Paulo";
export type AnoMes = { ano: number; mes: number };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const dois = (n: number) => String(n).padStart(2, "0");
const emSP = (d: Date) => new TZDate(d.getTime(), FUSO);

function inicioDe({ ano, mes }: AnoMes): Date {
  return new Date(new TZDate(ano, mes - 1, 1, 0, 0, 0, FUSO).getTime());
}

export function proximoMes({ ano, mes }: AnoMes): AnoMes {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

export function mesAnterior({ ano, mes }: AnoMes): AnoMes {
  return mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
}

export function limitesDoMes(am: AnoMes): { inicio: Date; fim: Date } {
  return { inicio: inicioDe(am), fim: inicioDe(proximoMes(am)) };
}

export function anoMesDe(d: Date): AnoMes {
  const z = emSP(d);
  return { ano: z.getFullYear(), mes: z.getMonth() + 1 };
}

export function mesAtual(agora: Date = new Date()): AnoMes {
  return anoMesDe(agora);
}

export function parseAnoMes(ano: string, mes: string): AnoMes | null {
  if (!/^\d{4}$/.test(ano) || !/^(0[1-9]|1[0-2])$/.test(mes)) return null;
  const a = Number(ano);
  if (a < 2000 || a > 2100) return null;
  return { ano: a, mes: Number(mes) };
}

export function caminhoDoMes({ ano, mes }: AnoMes): string {
  return `/${ano}/${dois(mes)}`;
}

export function nomeDoMes(mes: number): string {
  return MESES[mes - 1];
}

function hora(z: TZDate): string {
  const min = z.getMinutes();
  return `${z.getHours()}h${min ? dois(min) : ""}`;
}

export function formatarDataHora(d: Date): string {
  const z = emSP(d);
  return `${dois(z.getDate())}/${dois(z.getMonth() + 1)} · ${hora(z)}`;
}

export function partesDoCard(d: Date) {
  const z = emSP(d);
  return { dia: dois(z.getDate()), mesCurto: MESES_CURTOS[z.getMonth()], semana: SEMANA_CURTA[z.getDay()], hora: hora(z) };
}

export function jaRealizada(inicio: Date, duracaoMin: number, agora: Date = new Date()): boolean {
  return inicio.getTime() + duracaoMin * 60_000 <= agora.getTime();
}

export function paraInstante(data: string, horaMin: string): Date {
  const [a, m, d] = data.split("-").map(Number);
  const [h, mi] = horaMin.split(":").map(Number);
  return new Date(new TZDate(a, m - 1, d, h, mi, 0, FUSO).getTime());
}

export function partesLocais(d: Date): { data: string; hora: string } {
  const z = emSP(d);
  return {
    data: `${z.getFullYear()}-${dois(z.getMonth() + 1)}-${dois(z.getDate())}`,
    hora: `${dois(z.getHours())}:${dois(z.getMinutes())}`,
  };
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}
