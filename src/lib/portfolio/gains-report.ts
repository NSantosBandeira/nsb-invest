import { db } from "@/lib/db";
import { toNumber } from "@/lib/decimal";
import {
  calculateCaixinhaGains,
  calculateTradeGains,
  type CaixinhaGains,
  type TradeGains,
} from "@/lib/portfolio/gains";
import { getCdiAnnualRatePercent, getCdiDailyRatePercent } from "@/lib/market/cdi";
import { calculateCaixinhaBalance } from "@/lib/portfolio/caixinha";
import { buildPortfolioEvolution, type EvolutionPoint } from "@/lib/portfolio/evolution";
import {
  calculateFiiIncomeEstimate,
  sumEstimatedMonthlyFromDy,
  type FiiIncomeEstimate,
} from "@/lib/portfolio/fii-income";
import { calculateMarketValue } from "@/lib/portfolio/position";

export type TradePositionGains = {
  id: string;
  ticker: string;
  assetType: "fii" | "acao";
  quantity: number;
  currentPrice: number;
  dividendYield: number | null;
  lastQuoteAt: Date | null;
  gains: TradeGains;
  income?: FiiIncomeEstimate;
};

export type CaixinhaPositionGains = {
  id: string;
  name: string;
  gains: CaixinhaGains;
};

export type GainsReport = {
  patrimonio: number;
  totalInvestido: number;
  ganhoCapital: number;
  proventos: number;
  /** Soma das estimativas mensais (DY em FIIs + CDI em caixinhas) — não é dinheiro já recebido. */
  proventosEstimadosMensal: number;
  /** Ganho/renda do mês: caixinhas (mês atual) + DY mensal em FIIs e ações. */
  ganhoMensalEstimado: {
    total: number;
    caixinhas: number;
    fiis: number;
    acoes: number;
    hasEstimate: boolean;
  };
  ganhoTotal: number;
  ganhoTotalPercent: number;
  caixinhas: {
    total: number;
    ganho: number;
    rendimentos: number;
    positions: CaixinhaPositionGains[];
  };
  fiis: {
    total: number;
    ganho: number;
    proventos: number;
    rendaMensalEstimadaDy: number;
    rendaMensalMediaHistorico: number;
    positions: TradePositionGains[];
  };
  acoes: {
    total: number;
    ganho: number;
    proventos: number;
    positions: TradePositionGains[];
  };
  evolution: EvolutionPoint[];
};

export async function getGainsReport(userId: string): Promise<GainsReport> {
  const [caixinhas, fiiPositions, stockPositions, cdiAnnualRate, cdiDailyRate] =
    await Promise.all([
    db.caixinha.findMany({
      where: { userId },
      include: { movements: { orderBy: { date: "asc" } } },
    }),
    db.fiiPosition.findMany({
      where: { userId },
      include: { movements: { orderBy: { date: "asc" } } },
    }),
    db.stockPosition.findMany({
      where: { userId },
      include: { movements: { orderBy: { date: "asc" } } },
    }),
    getCdiAnnualRatePercent(),
    getCdiDailyRatePercent(),
  ]);

  const caixinhaPositions: CaixinhaPositionGains[] = caixinhas.map((c) => {
    const balance = calculateCaixinhaBalance(c.movements);
    return {
      id: c.id,
      name: c.name,
      gains: calculateCaixinhaGains(c.movements, balance, {
        cdiPercent: c.cdiPercent ? toNumber(c.cdiPercent) : null,
        cdiAnnualRate,
        cdiDailyRate,
      }),
    };
  });

  const fiiGainsList: TradePositionGains[] = fiiPositions.map((p) => {
    const quantity = toNumber(p.quantity);
    const averagePrice = toNumber(p.averagePrice);
    const currentPrice = toNumber(p.currentPrice);
    const marketValue = calculateMarketValue(quantity, currentPrice);
    const dividendYield = p.dividendYield ? toNumber(p.dividendYield) : null;
    return {
      id: p.id,
      ticker: p.ticker,
      assetType: "fii" as const,
      quantity,
      currentPrice,
      dividendYield,
      lastQuoteAt: p.lastQuoteAt,
      gains: calculateTradeGains(p.movements, quantity, averagePrice, currentPrice),
      income: calculateFiiIncomeEstimate(
        marketValue,
        dividendYield,
        p.movements,
      ),
    };
  });

  const stockGainsList: TradePositionGains[] = stockPositions.map((p) => {
    const quantity = toNumber(p.quantity);
    const averagePrice = toNumber(p.averagePrice);
    const currentPrice = toNumber(p.currentPrice);
    return {
      id: p.id,
      ticker: p.ticker,
      assetType: "acao" as const,
      quantity,
      currentPrice,
      dividendYield: p.dividendYield ? toNumber(p.dividendYield) : null,
      lastQuoteAt: p.lastQuoteAt,
      gains: calculateTradeGains(p.movements, quantity, averagePrice, currentPrice),
    };
  });

  const caixinhasTotal = caixinhaPositions.reduce((s, p) => s + p.gains.balance, 0);
  const caixinhasGanho = caixinhaPositions.reduce((s, p) => s + p.gains.gain, 0);
  const caixinhasRendimentos = caixinhaPositions.reduce(
    (s, p) => s + p.gains.rendimentos,
    0,
  );

  const fiisTotal = fiiGainsList.reduce((s, p) => s + p.gains.marketValue, 0);
  const fiisGanhoCapital = fiiGainsList.reduce(
    (s, p) => s + p.gains.unrealizedGain + p.gains.realizedGain,
    0,
  );
  const fiisProventos = fiiGainsList.reduce((s, p) => s + p.gains.dividends, 0);
  const fiisRendaMensalDy = sumEstimatedMonthlyFromDy(
    fiiGainsList.map((p) => p.income ?? { estimatedMonthlyFromDy: null }),
  );
  const fiisRendaMensalHistorico = fiiGainsList.reduce(
    (s, p) => s + (p.income?.averageMonthlyFromHistory ?? 0),
    0,
  );

  const acoesTotal = stockGainsList.reduce((s, p) => s + p.gains.marketValue, 0);
  const acoesGanhoCapital = stockGainsList.reduce(
    (s, p) => s + p.gains.unrealizedGain + p.gains.realizedGain,
    0,
  );
  const acoesProventos = stockGainsList.reduce((s, p) => s + p.gains.dividends, 0);

  const totalInvestido =
    caixinhaPositions.reduce((s, p) => s + p.gains.netDeposits, 0) +
    fiiGainsList.reduce((s, p) => s + p.gains.totalInvested, 0) +
    stockGainsList.reduce((s, p) => s + p.gains.totalInvested, 0);

  const patrimonio = caixinhasTotal + fiisTotal + acoesTotal;
  const ganhoCapital = caixinhasGanho + fiisGanhoCapital + acoesGanhoCapital;
  const proventos = fiisProventos + acoesProventos + caixinhasRendimentos;
  const caixinhasRendaEstimadaMensal = caixinhaPositions.reduce(
    (s, p) =>
      s + (p.gains.monthlyGainIsEstimated ? p.gains.monthlyGain : 0),
    0,
  );
  const proventosEstimadosMensal = fiisRendaMensalDy + caixinhasRendaEstimadaMensal;

  const caixinhasGanhoMensal = caixinhaPositions.reduce(
    (s, p) => s + p.gains.monthlyGain,
    0,
  );
  const acoesRendaMensalDy = stockGainsList.reduce((s, p) => {
    const { marketValue } = p.gains;
    const dy = p.dividendYield;
    if (marketValue > 0 && dy != null && dy > 0) {
      return s + (marketValue * (dy / 100)) / 12;
    }
    return s;
  }, 0);
  const ganhoMensalEstimado = {
    total: caixinhasGanhoMensal + fiisRendaMensalDy + acoesRendaMensalDy,
    caixinhas: caixinhasGanhoMensal,
    fiis: fiisRendaMensalDy,
    acoes: acoesRendaMensalDy,
    hasEstimate:
      caixinhaPositions.some(
        (p) => p.gains.monthlyGainIsEstimated && p.gains.monthlyGain !== 0,
      ) ||
      fiisRendaMensalDy > 0 ||
      acoesRendaMensalDy > 0,
  };

  const ganhoTotal = ganhoCapital;
  const ganhoTotalPercent =
    totalInvestido > 0 ? (ganhoTotal / totalInvestido) * 100 : 0;

  const evolution = buildPortfolioEvolution(caixinhas, fiiPositions, stockPositions);

  return {
    patrimonio,
    totalInvestido,
    ganhoCapital,
    proventos,
    proventosEstimadosMensal,
    ganhoMensalEstimado,
    ganhoTotal,
    ganhoTotalPercent,
    caixinhas: {
      total: caixinhasTotal,
      ganho: caixinhasGanho,
      rendimentos: caixinhasRendimentos,
      positions: caixinhaPositions,
    },
    fiis: {
      total: fiisTotal,
      ganho: fiisGanhoCapital,
      proventos: fiisProventos,
      rendaMensalEstimadaDy: fiisRendaMensalDy,
      rendaMensalMediaHistorico: fiisRendaMensalHistorico,
      positions: fiiGainsList,
    },
    acoes: {
      total: acoesTotal,
      ganho: acoesGanhoCapital,
      proventos: acoesProventos,
      positions: stockGainsList,
    },
    evolution,
  };
}

export function summarizeTradePositions(
  positions: TradePositionGains[],
): { marketValue: number; totalGain: number } {
  return positions.reduce(
    (acc, p) => ({
      marketValue: acc.marketValue + p.gains.marketValue,
      totalGain: acc.totalGain + p.gains.totalGain,
    }),
    { marketValue: 0, totalGain: 0 },
  );
}
