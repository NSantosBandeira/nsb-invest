import { db } from "@/lib/db";
import { toNumber } from "@/lib/decimal";
import { calculateCaixinhaBalance } from "@/lib/portfolio/caixinha";
import { calculateMarketValue } from "@/lib/portfolio/position";

export type RecentMovement = {
  id: string;
  date: Date;
  label: string;
  type: string;
  amount: number;
  assetType: "caixinha" | "fii" | "acao";
};

export type PortfolioSummary = {
  total: number;
  caixinhas: number;
  fiis: number;
  acoes: number;
  allocation: { name: string; value: number; percent: number }[];
  recentMovements: RecentMovement[];
};

export async function getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  const [caixinhas, fiiPositions, stockPositions] = await Promise.all([
    db.caixinha.findMany({
      where: { userId },
      include: { movements: true, institution: true },
    }),
    db.fiiPosition.findMany({ where: { userId } }),
    db.stockPosition.findMany({ where: { userId } }),
  ]);

  const caixinhasTotal = caixinhas.reduce(
    (sum, c) => sum + calculateCaixinhaBalance(c.movements),
    0,
  );

  const fiisTotal = fiiPositions.reduce(
    (sum, p) => sum + calculateMarketValue(toNumber(p.quantity), toNumber(p.currentPrice)),
    0,
  );

  const acoesTotal = stockPositions.reduce(
    (sum, p) => sum + calculateMarketValue(toNumber(p.quantity), toNumber(p.currentPrice)),
    0,
  );

  const total = caixinhasTotal + fiisTotal + acoesTotal;

  const allocation = [
    { name: "Caixinhas", value: caixinhasTotal },
    { name: "FIIs", value: fiisTotal },
    { name: "Ações", value: acoesTotal },
  ].map((item) => ({
    ...item,
    percent: total > 0 ? (item.value / total) * 100 : 0,
  }));

  const [caixinhaMovs, fiiMovs, stockMovs] = await Promise.all([
    db.caixinhaMovement.findMany({
      where: { userId },
      include: { caixinha: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.fiiMovement.findMany({
      where: { userId },
      include: { position: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    db.stockMovement.findMany({
      where: { userId },
      include: { position: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const recentMovements: RecentMovement[] = [
    ...caixinhaMovs.map((m) => ({
      id: m.id,
      date: m.date,
      label: m.caixinha.name,
      type: m.type,
      amount: toNumber(m.amount),
      assetType: "caixinha" as const,
    })),
    ...fiiMovs.map((m) => ({
      id: m.id,
      date: m.date,
      label: m.position.ticker,
      type: m.type,
      amount: toNumber(m.quantity) * toNumber(m.unitPrice),
      assetType: "fii" as const,
    })),
    ...stockMovs.map((m) => ({
      id: m.id,
      date: m.date,
      label: m.position.ticker,
      type: m.type,
      amount: toNumber(m.quantity) * toNumber(m.unitPrice),
      assetType: "acao" as const,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return {
    total,
    caixinhas: caixinhasTotal,
    fiis: fiisTotal,
    acoes: acoesTotal,
    allocation,
    recentMovements,
  };
}
