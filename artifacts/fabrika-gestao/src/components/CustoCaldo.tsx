import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import {
  TAMANHOS, CAPACIDADE_ML, calcularProduto, custoUnitario, carregarEstado, salvarEstado, estadoPadrao,
  type CustosState, type Insumo, type Produto, type Tamanho,
} from "../lib/custos";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlFino = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const num = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const CATEGORIA_LABEL: Record<Insumo["categoria"], string> = {
  base: "🧊 Base", ingrediente: "🍋 Ingredientes", embalagem: "🥤 Embalagens",
};
const UNIDADE_LABEL: Record<Insumo["unidade"], string> = { ml: "ml", g: "g", un: "un", colher: "colher" };

function cmvCor(cmv: number | null) {
  if (cmv === null) return "#6b7280";
  if (cmv <= 30) return "#10b981";
  if (cmv <= 40) return "#f59e0b";
  return "#ef4444";
}

function NumInput({ value, onChange, width = 90, prefix }: { value: number; onChange: (n: number) => void; width?: number; prefix?: string }) {
  const [txt, setTxt] = useState(value ? String(value).replace(".", ",") : "");
  useEffect(() => {
    const atual = parseFloat(txt.replace(",", ".")) || 0;
    if (atual !== value) setTxt(value ? String(value).replace(".", ",") : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: "inline-flex", alignItems: "center", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, padding: "0 8px", width }}>
      {prefix && <span style={{ color: "#6b7280", fontSize: 12, marginRight: 4 }}>{prefix}</span>}
      <input inputMode="decimal" value={txt} placeholder="0"
        onChange={e => {
          const t = e.target.value.replace(/[^\d.,]/g, "");
          setTxt(t);
          onChange(parseFloat(t.replace(",", ".")) || 0);
        }}
        style={{ width: "100%", padding: "7px 0", background: "transparent", border: "none", color: "#e8eaf0", fontSize: 13, outline: "none" }} />
    </div>
  );
}

const card = { background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14 };

export default function CustoCaldo() {
  const isMobile = useIsMobile();
  const [estado, setEstado] = useState<CustosState>(carregarEstado);
  const [aba, setAba] = useState<"produtos" | "insumos">("produtos");
  const [filtroTamanho, setFiltroTamanho] = useState<Tamanho | "Todos">("Todos");
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => { salvarEstado(estado); }, [estado]);

  const { insumos, produtos, cmvAlvo } = estado;
  const caldo = insumos.find(i => i.id === "caldo");
  const custoMl = custoUnitario(caldo);

  const resultados = useMemo(
    () => new Map(produtos.map(p => [p.id, calcularProduto(p, insumos, cmvAlvo)])),
    [produtos, insumos, cmvAlvo],
  );

  const sabores = useMemo(() => {
    const m = new Map<string, Produto[]>();
    produtos
      .filter(p => filtroTamanho === "Todos" || p.tamanho === filtroTamanho)
      .forEach(p => m.set(p.sabor, [...(m.get(p.sabor) || []), p]));
    return [...m.entries()];
  }, [produtos, filtroTamanho]);

  const atualizarInsumo = (id: string, patch: Partial<Insumo>) =>
    setEstado(s => ({ ...s, insumos: s.insumos.map(i => (i.id === id ? { ...i, ...patch } : i)) }));
  const atualizarProduto = (id: string, f: (p: Produto) => Produto) =>
    setEstado(s => ({ ...s, produtos: s.produtos.map(p => (p.id === id ? f(p) : p)) }));
  const restaurar = () => {
    if (confirm("Restaurar preços e fichas técnicas padrão? Suas alterações serão perdidas.")) setEstado(estadoPadrao());
  };

  // Média de custo por tamanho (todos os sabores)
  const mediaPorTamanho = TAMANHOS.map(t => {
    const lista = produtos.filter(p => p.tamanho === t).map(p => resultados.get(p.id)!.custoTotal);
    return { t, qtd: lista.length, media: lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : 0 };
  });

  const tabBtn = (id: typeof aba, label: string) => (
    <button key={id} onClick={() => setAba(id)}
      style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: aba === id ? "linear-gradient(135deg,#10b981,#059669)" : "#1a1d2e", color: aba === id ? "#fff" : "#9ca3af" }}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>🥤 Custo do Caldo de Cana</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>Ficha técnica Kaná · {produtos.length} bebidas · 300ml, 500ml e 1L</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {tabBtn("produtos", "📋 Bebidas")}
          {tabBtn("insumos", "💲 Insumos e preços")}
        </div>
      </div>

      {/* Caldo puro */}
      <div style={{ ...card, padding: isMobile ? 16 : 20, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Valor pago na cana</div>
            <NumInput prefix="R$" width={130} value={caldo?.precoCompra || 0} onChange={n => atualizarInsumo("caldo", { precoCompra: n })} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Rendeu (litros de caldo)</div>
            <NumInput width={130} value={(caldo?.rendimento || 0) / 1000} onChange={n => atualizarInsumo("caldo", { rendimento: n * 1000 })} />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginLeft: isMobile ? 0 : "auto" }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Custo por litro</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", fontFamily: "'Space Mono',monospace" }}>{brl(custoMl * 1000)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Custo por 100ml</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#e8eaf0", fontFamily: "'Space Mono',monospace" }}>{brlFino(custoMl * 100)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10, marginTop: 16 }}>
          {mediaPorTamanho.map(({ t, qtd, media }) => (
            <div key={t} style={{ background: "#1a1d2e", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{t} · custo médio</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 2 }}>{qtd ? brl(media) : "—"}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{qtd} bebida(s) com insumos + embalagem</div>
            </div>
          ))}
        </div>
      </div>

      {aba === "produtos" && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            {(["Todos", ...TAMANHOS] as const).map(t => (
              <button key={t} onClick={() => setFiltroTamanho(t)}
                style={{ padding: "6px 14px", borderRadius: 99, border: `1px solid ${filtroTamanho === t ? "#10b981" : "#2d3148"}`, background: filtroTamanho === t ? "#10b98120" : "transparent", color: filtroTamanho === t ? "#10b981" : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {t}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#9ca3af" }}>
              CMV alvo
              <NumInput width={70} value={cmvAlvo} onChange={n => setEstado(s => ({ ...s, cmvAlvo: n }))} />%
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sabores.map(([sabor, lista]) => (
              <div key={sabor} style={{ ...card, padding: isMobile ? 14 : 18 }}>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 16, marginBottom: 10 }}>{sabor}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lista.map(p => {
                    const r = resultados.get(p.id)!;
                    const expandido = aberto === p.id;
                    return (
                      <div key={p.id} style={{ background: "#1a1d2e", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "70px 1fr 1fr 1fr 1fr 1fr auto", gap: isMobile ? 8 : 12, alignItems: "center" }}>
                          <div style={{ fontWeight: 700, color: "#10b981" }}>{p.tamanho}</div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Custo total</div>
                            <div style={{ fontWeight: 700, color: "#fff" }}>{brl(r.custoTotal)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Preço de venda</div>
                            <NumInput prefix="R$" value={p.precoVenda} onChange={n => atualizarProduto(p.id, x => ({ ...x, precoVenda: n }))} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Lucro bruto</div>
                            <div style={{ fontWeight: 700, color: r.lucro === null ? "#6b7280" : r.lucro >= 0 ? "#10b981" : "#ef4444" }}>{r.lucro === null ? "—" : brl(r.lucro)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>CMV</div>
                            <div style={{ fontWeight: 700, color: cmvCor(r.cmv) }}>{r.cmv === null ? "—" : `${num(r.cmv)}%`}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Sugerido ({num(cmvAlvo, 0)}%)</div>
                            <div style={{ fontWeight: 600, color: "#9ca3af" }}>{brl(r.precoSugerido)}</div>
                          </div>
                          <button onClick={() => setAberto(expandido ? null : p.id)}
                            style={{ gridColumn: isMobile ? "1 / -1" : undefined, background: "#0f1117", border: "1px solid #2d3148", borderRadius: 8, color: "#9ca3af", cursor: "pointer", padding: "6px 12px", fontSize: 12 }}>
                            {expandido ? "Fechar ficha ▲" : "Ver ficha ▼"}
                          </button>
                        </div>

                        {expandido && (
                          <div style={{ marginTop: 12, borderTop: "1px solid #2d3148", paddingTop: 12, overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 420 }}>
                              <thead>
                                <tr style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", textAlign: "left" }}>
                                  <th style={{ padding: "4px 6px" }}>Insumo</th>
                                  <th style={{ padding: "4px 6px" }}>Quantidade</th>
                                  <th style={{ padding: "4px 6px" }}>Custo unit.</th>
                                  <th style={{ padding: "4px 6px", textAlign: "right" }}>Custo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.linhas.map((l, idx) => (
                                  <tr key={idx} style={{ borderTop: "1px solid #23263a" }}>
                                    <td style={{ padding: "6px", color: "#e8eaf0" }}>{l.insumo?.nome ?? l.insumoId}</td>
                                    <td style={{ padding: "6px" }}>
                                      {l.restante ? (
                                        <span style={{ color: "#9ca3af" }}>{num(l.qtd, 0)} {l.insumo ? UNIDADE_LABEL[l.insumo.unidade] : ""} <span style={{ fontSize: 11 }}>(restante do copo)</span></span>
                                      ) : (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                          <NumInput width={80} value={Math.round(l.qtd * 1000) / 1000}
                                            onChange={n => atualizarProduto(p.id, x => ({ ...x, itens: x.itens.map((it, i) => (i === idx ? { ...it, qtd: n } : it)) }))} />
                                          <span style={{ color: "#6b7280" }}>{l.insumo ? UNIDADE_LABEL[l.insumo.unidade] : ""}</span>
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: "6px", color: "#9ca3af" }}>{brlFino(custoUnitario(l.insumo))}</td>
                                    <td style={{ padding: "6px", textAlign: "right", fontWeight: 600, color: "#fff" }}>{brlFino(l.custo)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr style={{ borderTop: "1px solid #2d3148" }}>
                                  <td colSpan={3} style={{ padding: "8px 6px", color: "#9ca3af" }}>
                                    Caldo {brl(r.custoCaldo)} · Embalagem {brl(r.custoEmbalagem)} · Outros {brl(r.custoTotal - r.custoCaldo - r.custoEmbalagem)}
                                  </td>
                                  <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#10b981" }}>{brl(r.custoTotal)}</td>
                                </tr>
                              </tfoot>
                            </table>
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                              Gelo = {CAPACIDADE_ML[p.tamanho]}ml do copo menos os itens em ml/g (1g ≈ 1ml).
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {aba === "insumos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b30", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#d1d5db", lineHeight: 1.6 }}>
            💡 Informe <strong>quanto pagou</strong> e <strong>quanto rendeu</strong> na unidade usada na ficha.
            Ex.: limão R$ 6,00 rende 12 un · abacaxi R$ 8,00 rende 1000 g de polpa. Os preços iniciais são exemplos, ajuste para os seus.
          </div>
          {(["base", "ingrediente", "embalagem"] as const).map(cat => (
            <div key={cat} style={{ ...card, padding: isMobile ? 14 : 18 }}>
              <div style={{ fontWeight: 700, color: "#fff", marginBottom: 10 }}>{CATEGORIA_LABEL[cat]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insumos.filter(i => i.categoria === cat).map(i => (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.4fr 1fr 1fr 1fr", gap: 10, alignItems: "center", background: "#1a1d2e", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ gridColumn: isMobile ? "1 / -1" : undefined }}>
                      <div style={{ fontWeight: 600, color: "#e8eaf0" }}>{i.nome}</div>
                      {i.dica && <div style={{ fontSize: 11, color: "#6b7280" }}>{i.dica}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Valor pago</div>
                      <NumInput prefix="R$" width={110} value={i.precoCompra} onChange={n => atualizarInsumo(i.id, { precoCompra: n })} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Rende ({UNIDADE_LABEL[i.unidade]})</div>
                      <NumInput width={110} value={i.rendimento} onChange={n => atualizarInsumo(i.id, { rendimento: n })} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase" }}>Custo por {UNIDADE_LABEL[i.unidade]}</div>
                      <div style={{ fontWeight: 700, color: "#10b981" }}>{brlFino(custoUnitario(i))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={restaurar}
            style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid #ef444460", borderRadius: 8, color: "#ef4444", cursor: "pointer", padding: "8px 16px", fontSize: 13, fontWeight: 600 }}>
            ↺ Restaurar valores padrão
          </button>
        </div>
      )}
    </div>
  );
}
