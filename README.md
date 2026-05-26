# NSB Invest

SaaS para controle de investimentos pessoais: **caixinhas** (renda fixa / CDI), **FIIs** e **ações**. Cada usuário tem carteira isolada (multi-tenant).

## Funcionalidades

- **Autenticação** — registro e login (Auth.js / NextAuth v5)
- **Caixinhas** — aportes, resgates, rendimentos, ajuste de saldo, % do CDI
- **Estimativa CDI** — ganho hoje, no mês e total simulados (taxa do BCB + % da caixinha)
- **FIIs e ações** — compra, venda, dividendo, preço médio automático
- **Mercado** — cotação e DY via Investidor10 e/ou [Brapi](https://brapi.dev) (`BRAPI_TOKEN` opcional)
- **~Renda/mês (FIIs)** — estimativa por DY: patrimônio × yield ÷ 12
- **Ganhos** — patrimônio, ganho de capital, proventos recebidos vs estimados, evolução em gráfico
- **Importação** — CSV e planilha Excel (abas BOLSA / FIIS)
- **Instituições** — cadastro com presets (bancos e corretoras)
- **Dashboard** — alocação por tipo, movimentações recentes
- **Rede local** — colegas na mesma Wi‑Fi acessam pelo IP (`npm run lan:url`)

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | Server Actions, Auth.js v5 |
| Banco | PostgreSQL, Prisma 7 |
| Dev | Docker Compose (Postgres) |

## Pré-requisitos

- **Node.js 20+**
- **Docker** (só para Postgres em desenvolvimento)
- **Git** (para publicar no GitHub)

## Desenvolvimento local

```bash
git clone https://github.com/NSantosBandeira/invest.git
cd invest
npm install
cp .env.example .env
```

Edite `.env`: gere `AUTH_SECRET` com `openssl rand -base64 32`.

```bash
npm run db:up        # Postgres no Docker
npm run dev:setup    # prisma migrate deploy
npm run dev          # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Postgres (local: `localhost:5432`) |
| `AUTH_SECRET` | Sim | Segredo do Auth.js |
| `AUTH_URL` | Sim em produção | URL pública do app |
| `AUTH_TRUST_HOST` | Sim em Vercel/Docker | `true` |
| `MARKET_DATA_PROVIDER` | Não | `auto`, `investidor10` ou `brapi` |
| `BRAPI_TOKEN` | Não | Token Brapi |
| `CDI_ANNUAL_PERCENT` | Não | Fallback se API do BCB falhar |

### Colegas na mesma rede

```bash
npm run lan:url   # ex.: http://192.168.1.42:3000
```

Postgres continua só na sua máquina; os colegas acessam a porta **3000**.

### Docker (app + banco, opcional)

```bash
docker compose --profile full up --build
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (escuta `0.0.0.0`) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run db:up` | Sobe só o Postgres |
| `npm run dev:setup` | Aplica migrations |
| `npm run lan:url` | URL para acesso na LAN |
| `npx prisma studio` | UI do banco |

## Estrutura

```
src/
├── app/              # Rotas (login, dashboard, ganhos, …)
├── actions/          # Server Actions
├── components/       # UI
└── lib/
    ├── portfolio/    # Ganhos, CDI, FIIs, caixinhas
    └── market/       # Cotações, BCB, Brapi
prisma/
├── schema.prisma
└── migrations/
```

## Publicar no GitHub

Na pasta do projeto (ainda sem Git):

```bash
git init
git add .
git commit -m "feat: MVP NSB Invest — caixinhas, FIIs, ações e ganhos"
git branch -M main
git remote add origin https://github.com/NSantosBandeira/invest.git
git push -u origin main
```

**Não commite** `.env` — ele já está no `.gitignore`. Use só `.env.example` no repositório.

Sugestão de descrição do repositório no GitHub:

> Controle de investimentos (caixinhas, FIIs e ações) com estimativa CDI/DY, ganhos e dashboard — Next.js + PostgreSQL.

Topics sugeridos: `nextjs`, `typescript`, `prisma`, `postgresql`, `investimentos`, `fii`, `saas`

## Deploy na Vercel

1. Crie um Postgres na nuvem ([Neon](https://neon.tech), Supabase ou Vercel Postgres).
2. Importe o repositório na [Vercel](https://vercel.com).
3. Configure as variáveis de ambiente (mesmas do `.env.example`, com `AUTH_URL` = `https://seu-app.vercel.app`).
4. **Build Command:**

```bash
prisma generate && prisma migrate deploy && next build
```

5. Após o deploy, acesse `/register` e crie o primeiro usuário.

## Conceitos importantes

| Termo | Significado no app |
|-------|---------------------|
| **Proventos (recebidos)** | Dividendos/rendimentos que você **lançou** no histórico |
| **~Renda/mês** | Estimativa pelo **DY** (FIIs) — não é dinheiro recebido |
| **Ganho hoje (caixinha)** | Estimativa **CDI** ou rendimento lançado no dia |
| **Aporte** | Aumenta saldo; **não** conta como ganho do dia |

## Licença

Projeto privado — defina a licença conforme sua necessidade (MIT, etc.).
