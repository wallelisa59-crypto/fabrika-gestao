// ── Custo de bebidas com caldo de cana (Ficha técnica Kaná) ──────────

export type Unidade = "ml" | "g" | "un" | "colher";
export type Categoria = "base" | "ingrediente" | "embalagem";
export type Tamanho = "300ml" | "500ml" | "1L";

export const TAMANHOS: Tamanho[] = ["300ml", "500ml", "1L"];
export const CAPACIDADE_ML: Record<Tamanho, number> = { "300ml": 300, "500ml": 500, "1L": 1000 };

export interface Insumo {
  id: string;
  nome: string;
  categoria: Categoria;
  unidade: Unidade;
  /** Quanto foi pago na compra (R$) */
  precoCompra: number;
  /** Quanto essa compra rende, na unidade de uso (ex.: ml de caldo extraído) */
  rendimento: number;
  dica?: string;
}

export interface ItemFicha {
  insumoId: string;
  qtd: number;
  /** Completa o copo (ex.: gelo "restante") */
  restante?: boolean;
}

export interface Produto {
  id: string;
  sabor: string;
  tamanho: Tamanho;
  precoVenda: number;
  itens: ItemFicha[];
}

export interface CustosState {
  insumos: Insumo[];
  produtos: Produto[];
  cmvAlvo: number;
}

export function custoUnitario(i: Insumo | undefined): number {
  if (!i || !i.rendimento) return 0;
  return i.precoCompra / i.rendimento;
}

/** Volume ocupado (ml ≈ g) pelos itens que não completam o copo */
function volumeOcupado(p: Produto, insumos: Map<string, Insumo>): number {
  return p.itens.reduce((s, it) => {
    const ins = insumos.get(it.insumoId);
    if (it.restante || !ins || (ins.unidade !== "ml" && ins.unidade !== "g")) return s;
    return s + it.qtd;
  }, 0);
}

export interface LinhaCusto {
  insumo: Insumo | undefined;
  insumoId: string;
  qtd: number;
  restante: boolean;
  custo: number;
}

export interface ResultadoProduto {
  linhas: LinhaCusto[];
  custoTotal: number;
  custoCaldo: number;
  custoEmbalagem: number;
  lucro: number | null;
  cmv: number | null;
  markup: number | null;
  precoSugerido: number;
}

export function calcularProduto(p: Produto, insumosArr: Insumo[], cmvAlvo: number): ResultadoProduto {
  const insumos = new Map(insumosArr.map(i => [i.id, i]));
  const livre = Math.max(0, CAPACIDADE_ML[p.tamanho] - volumeOcupado(p, insumos));
  const linhas = p.itens.map(it => {
    const insumo = insumos.get(it.insumoId);
    const qtd = it.restante ? livre : it.qtd;
    return { insumo, insumoId: it.insumoId, qtd, restante: !!it.restante, custo: qtd * custoUnitario(insumo) };
  });
  const soma = (f: (l: LinhaCusto) => boolean) => linhas.filter(f).reduce((s, l) => s + l.custo, 0);
  const custoTotal = soma(() => true);
  const venda = p.precoVenda > 0 ? p.precoVenda : null;
  return {
    linhas,
    custoTotal,
    custoCaldo: soma(l => l.insumoId === "caldo"),
    custoEmbalagem: soma(l => l.insumo?.categoria === "embalagem"),
    lucro: venda !== null ? venda - custoTotal : null,
    cmv: venda !== null ? (custoTotal / venda) * 100 : null,
    markup: venda !== null && custoTotal > 0 ? venda / custoTotal : null,
    precoSugerido: cmvAlvo > 0 ? custoTotal / (cmvAlvo / 100) : 0,
  };
}

// ── Valores padrão (ficha técnica da planilha) ───────────────────────
// Preços são exemplos para começar: ajuste na aba "Insumos".

export const INSUMOS_PADRAO: Insumo[] = [
  { id: "caldo", nome: "Caldo de Cana", categoria: "base", unidade: "ml", precoCompra: 100, rendimento: 50000, dica: "Valor pago na cana (+ moagem) e quantos ml de caldo ela rendeu" },
  { id: "gelo", nome: "Gelo", categoria: "base", unidade: "g", precoCompra: 15, rendimento: 10000, dica: "Ex.: saco de 10 kg" },
  { id: "limao", nome: "Limão", categoria: "ingrediente", unidade: "un", precoCompra: 6, rendimento: 12 },
  { id: "abacaxi", nome: "Abacaxi", categoria: "ingrediente", unidade: "g", precoCompra: 8, rendimento: 1000, dica: "Rendimento em polpa limpa" },
  { id: "acerola", nome: "Acerola", categoria: "ingrediente", unidade: "g", precoCompra: 10, rendimento: 1000 },
  { id: "morango", nome: "Morango", categoria: "ingrediente", unidade: "g", precoCompra: 7, rendimento: 250 },
  { id: "melao", nome: "Melão", categoria: "ingrediente", unidade: "g", precoCompra: 10, rendimento: 1500, dica: "Rendimento em polpa limpa" },
  { id: "tonica", nome: "Água Tônica Zero", categoria: "ingrediente", unidade: "ml", precoCompra: 4, rendimento: 350 },
  { id: "guarana", nome: "Pó de Guaraná", categoria: "ingrediente", unidade: "colher", precoCompra: 20, rendimento: 15, dica: "Quantas colheres de sopa rende o pacote" },
  { id: "cafe", nome: "Café (pó)", categoria: "ingrediente", unidade: "g", precoCompra: 30, rendimento: 500 },
  { id: "acai", nome: "Açaí", categoria: "ingrediente", unidade: "ml", precoCompra: 25, rendimento: 1000 },
  { id: "copo300", nome: "Copo 300ml", categoria: "embalagem", unidade: "un", precoCompra: 25, rendimento: 100 },
  { id: "copo500", nome: "Copo 500ml", categoria: "embalagem", unidade: "un", precoCompra: 35, rendimento: 100 },
  { id: "tampa", nome: "Tampa", categoria: "embalagem", unidade: "un", precoCompra: 10, rendimento: 100 },
  { id: "canudo", nome: "Canudo", categoria: "embalagem", unidade: "un", precoCompra: 5, rendimento: 100 },
  { id: "garrafa1l", nome: "Garrafa 1L (com tampa)", categoria: "embalagem", unidade: "un", precoCompra: 120, rendimento: 100 },
];

const EMBALAGEM: Record<Tamanho, ItemFicha[]> = {
  "300ml": [{ insumoId: "copo300", qtd: 1 }, { insumoId: "tampa", qtd: 1 }, { insumoId: "canudo", qtd: 1 }],
  "500ml": [{ insumoId: "copo500", qtd: 1 }, { insumoId: "tampa", qtd: 1 }, { insumoId: "canudo", qtd: 1 }],
  "1L": [{ insumoId: "garrafa1l", qtd: 1 }],
};

type Receita = [insumoId: string, qtd: number][];

function produto(sabor: string, tamanho: Tamanho, receita: Receita): Produto {
  return {
    id: `${sabor}-${tamanho}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    sabor,
    tamanho,
    precoVenda: 0,
    itens: [
      ...receita.map(([insumoId, qtd]) => ({ insumoId, qtd })),
      { insumoId: "gelo", qtd: 0, restante: true },
      ...EMBALAGEM[tamanho].map(i => ({ ...i })),
    ],
  };
}

export const PRODUTOS_PADRAO: Produto[] = [
  produto("Tradicional", "300ml", [["caldo", 250]]),
  produto("Tradicional", "500ml", [["caldo", 440]]),
  produto("Tradicional", "1L", [["caldo", 900]]),
  produto("Limão", "300ml", [["caldo", 250], ["limao", 0.5]]),
  produto("Limão", "500ml", [["caldo", 440], ["limao", 1]]),
  produto("Limão", "1L", [["caldo", 900], ["limao", 2]]),
  produto("Abacaxi", "300ml", [["caldo", 200], ["abacaxi", 35]]),
  produto("Abacaxi", "500ml", [["caldo", 400], ["abacaxi", 50]]),
  produto("Cana Tônica", "300ml", [["caldo", 120], ["tonica", 120], ["limao", 0.5]]),
  produto("Cana Tônica", "500ml", [["caldo", 200], ["tonica", 200], ["limao", 1]]),
  produto("Shake com Guaraná", "300ml", [["caldo", 250], ["guarana", 1 / 3], ["limao", 0.5]]),
  produto("Shake com Guaraná", "500ml", [["caldo", 400], ["guarana", 0.5], ["limao", 1]]),
  produto("Morango", "300ml", [["caldo", 220], ["morango", 50]]),
  produto("Morango", "500ml", [["caldo", 410], ["morango", 70]]),
  produto("Melão", "300ml", [["caldo", 210], ["melao", 80]]),
  produto("Melão", "500ml", [["caldo", 390], ["melao", 100]]),
  produto("Abacaxi e Acerola", "300ml", [["caldo", 210], ["abacaxi", 35], ["acerola", 35]]),
  produto("Abacaxi e Acerola", "500ml", [["caldo", 390], ["abacaxi", 35], ["acerola", 35]]),
  produto("Café Coado com Caldo", "300ml", [["cafe", 17], ["caldo", 140], ["limao", 0.5]]),
  produto("Café Coado com Caldo", "500ml", [["cafe", 25], ["caldo", 220], ["limao", 1]]),
  produto("Açaí", "300ml", [["caldo", 170], ["acai", 100]]),
  produto("Açaí", "500ml", [["caldo", 270], ["acai", 200]]),
];

export function estadoPadrao(): CustosState {
  return {
    insumos: INSUMOS_PADRAO.map(i => ({ ...i })),
    produtos: PRODUTOS_PADRAO.map(p => ({ ...p, itens: p.itens.map(i => ({ ...i })) })),
    cmvAlvo: 30,
  };
}

const STORAGE_KEY = "kana-custos-v1";

export function carregarEstado(): CustosState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s?.insumos) && Array.isArray(s?.produtos)) return { cmvAlvo: 30, ...s };
    }
  } catch { /* storage indisponível */ }
  return estadoPadrao();
}

export function salvarEstado(s: CustosState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage indisponível */ }
}
