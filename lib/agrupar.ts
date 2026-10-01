import { anoMesDe, jaRealizada, type AnoMes } from "./datas";

export function agruparPorMes<T extends { inicio: Date }>(itens: T[]): { anoMes: AnoMes; itens: T[] }[] {
  const grupos: { anoMes: AnoMes; itens: T[] }[] = [];
  for (const item of itens) {
    const am = anoMesDe(item.inicio);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.anoMes.ano === am.ano && ultimo.anoMes.mes === am.mes) ultimo.itens.push(item);
    else grupos.push({ anoMes: am, itens: [item] });
  }
  return grupos;
}

export function separarPorStatus<T extends { inicio: Date; duracaoMin: number }>(itens: T[], agora: Date = new Date()) {
  const porData = (x: T, y: T) => x.inicio.getTime() - y.inicio.getTime();
  const proximas = itens.filter((i) => !jaRealizada(i.inicio, i.duracaoMin, agora)).sort(porData);
  const realizadas = itens.filter((i) => jaRealizada(i.inicio, i.duracaoMin, agora)).sort((x, y) => porData(y, x));
  return { proximas, realizadas };
}
