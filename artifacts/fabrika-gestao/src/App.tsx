import { useState, useEffect, useCallback, useRef } from "react";

const CANAIS = ["WhatsApp", "Instagram", "E-mail", "Telefone", "Presencial", "Outro"];
const STATUS = ["Em negociação", "Em desenvolvimento", "Perdido", "Concluído"];
const NOTAS = ["😠 Ruim", "😐 Regular", "😊 Bom", "🤩 Ótimo"];
const TIPOS_CONTRATO = ["Por projeto", "Pacote mensal de serviços"];
const MODELOS_COBRANCA = ["Fee mensal", "Hora técnica / banco de horas", "Performance + fee fixo"];
const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Cartão de Débito", "Cartão de Crédito"];
const BANDEIRAS = ["Mastercard", "Visa", "Elo", "American Express"];
const FORMA_ICONS: Record<string, string> = { "Pix": "⚡", "Boleto": "🧾", "Cartão de Débito": "💳", "Cartão de Crédito": "💳" };

const CANAL_ICONS: Record<string, string> = {
  WhatsApp: "💬", Instagram: "📸", "E-mail": "📧",
  Telefone: "📞", Presencial: "🤝", Outro: "📌",
};
const STATUS_COLORS: Record<string, string> = {
  "Em negociação": "#f59e0b", "Em desenvolvimento": "#3b82f6",
  "Perdido": "#ef4444", "Concluído": "#10b981",
};
const STATUS_ICONS: Record<string, string> = {
  "Em negociação": "🤝", "Em desenvolvimento": "⚙️",
  "Perdido": "❌", "Concluído": "✅",
};

function formatCPF(val: string) {
  const n = val.replace(/\D/g, "").slice(0, 11);
  return n
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCNPJ(val: string) {
  const n = val.replace(/\D/g, "").slice(0, 14);
  return n
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatDuration(min: number | null | undefined) {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function classifyResposta(min: number | null) {
  if (!min) return null;
  if (min <= 15) return { label: "Excelente", color: "#10b981" };
  if (min <= 60) return { label: "Bom", color: "#3b82f6" };
  if (min <= 240) return { label: "Regular", color: "#f59e0b" };
  return { label: "Lento", color: "#ef4444" };
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function formatDateTime(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatBRL(val: number | string | undefined | null) {
  if (!val) return "—";
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function diasRestantes(prazo: string | undefined) {
  if (!prazo) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const p = new Date(prazo + "T00:00:00");
  return Math.ceil((p.getTime() - hoje.getTime()) / 86400000);
}

function chaveCliente(a: any) {
  return (a.empresa || a.nomeCliente || a.cliente || "").trim().toLowerCase();
}

function getClientes(atendimentos: any[]) {
  const map: any = {};
  atendimentos.forEach(a => {
    const key = chaveCliente(a);
    if (!key) return;
    if (!map[key]) map[key] = {
      nomeCliente: a.nomeCliente || a.cliente || "",
      empresa: a.empresa || "",
      atendimentos: []
    };
    map[key].atendimentos.push(a);
  });
  return Object.values(map).sort((a: any, b: any) =>
    (a.empresa || a.nomeCliente).localeCompare(b.empresa || b.nomeCliente)
  );
}

function calcMetrics(atendimentos: any[]) {
  const total = atendimentos.length;
  const concluidos = atendimentos.filter(a => a.status === "Concluído");
  const perdidos = atendimentos.filter(a => a.status === "Perdido");
  const comResposta = atendimentos.filter(a => a.tempoResposta);
  const comConclusao = concluidos.filter(a => a.tempoConclusao);
  const comFeedback = atendimentos.filter(a => a.feedbackNota);
  const comContrato = atendimentos.filter(a => a.valorContrato);
  const avgResposta = comResposta.length ? Math.round(comResposta.reduce((s: number, a: any) => s + a.tempoResposta, 0) / comResposta.length) : null;
  const avgConclusao = comConclusao.length ? Math.round(comConclusao.reduce((s: number, a: any) => s + a.tempoConclusao, 0) / comConclusao.length) : null;
  const notaMap: any = { "😠 Ruim": 1, "😐 Regular": 2, "😊 Bom": 3, "🤩 Ótimo": 4 };
  const avgFeedback = comFeedback.length ? (comFeedback.reduce((s: number, a: any) => s + notaMap[a.feedbackNota], 0) / comFeedback.length).toFixed(1) : null;
  const recorrentes = atendimentos.filter(a => a.recorrenciaAutomatica && !a.assinaturaCancelada);
  const receitaRecorrente = recorrentes.reduce((s: number, a: any) => s + Number(a.valorContrato || 0), 0);
  const receitaAvulsa = atendimentos.filter(a => a.valorContrato && !a.recorrenciaAutomatica).reduce((s: number, a: any) => s + Number(a.valorContrato), 0);
  const vencendoHoje = atendimentos.filter(a => { const d = diasRestantes(a.prazoEntrega); return d !== null && d >= 0 && d <= 3 && a.status !== "Concluído"; });
  const atrasados = atendimentos.filter(a => { const d = diasRestantes(a.prazoEntrega); return d !== null && d < 0 && a.status !== "Concluído"; });
  const porCanal: any = {}; CANAIS.forEach(c => { porCanal[c] = atendimentos.filter(a => a.canal === c).length; });
  const porStatus: any = {}; STATUS.forEach(s => { porStatus[s] = atendimentos.filter(a => a.status === s).length; });
  return {
    total, perdidos: perdidos.length, concluidos: concluidos.length,
    avgResposta, avgConclusao, avgFeedback, feedbackCount: comFeedback.length,
    receitaRecorrente, receitaAvulsa, recorrentes,
    vencendoHoje, atrasados,
    taxaPerdido: total > 0 ? ((perdidos.length / total) * 100).toFixed(0) : 0,
    taxaConclusao: total > 0 ? ((concluidos.length / total) * 100).toFixed(0) : 0,
    porCanal, porStatus,
  };
}

const EMPTY_FORM = {
  nomeCliente: "", empresa: "", canal: "", responsavel: "", descricao: "",
  status: "Em negociação", tempoRespostaHoras: "", tempoRespostaMinutos: "",
  tempoConclusaoHoras: "", tempoConclusaoMinutos: "",
  observacao: "", valorContrato: "", tipoContrato: "", prazoEntrega: "",
  tipoPessoa: "fisica" as "fisica" | "juridica", cpf: "", cnpj: "",
  modeloCobranca: "", formaPagamento: "", bandeira: "", parcelas: "",
  valorEntrada: "", recorrenciaAutomatica: false as boolean, pagamentoAntecipado: false as boolean,
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{children}</label>
);
const Field = ({ value, onChange, placeholder, type = "text", min }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; min?: string }) => (
  <input type={type} min={min} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
);

function FeedbackModal({ atendimento, onSave, onClose }: any) {
  const [nota, setNota] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviado, setEnviado] = useState(false);
  const a = atendimento;
  if (!a) return null;
  if (enviado || a.feedbackNota) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 16 }}>
          {a.feedbackNota && !enviado ? "Feedback já registrado!" : "Obrigado pelo feedback!"}
        </div>
        <div style={{ color: "#6b7280", marginTop: 8 }}>
          {a.feedbackNota && !enviado ? `Avaliação: ${a.feedbackNota}` : "Sua opinião foi registrada com sucesso."}
        </div>
        <button onClick={onClose} style={{ marginTop: 24, padding: "10px 28px", background: "#6366f1", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Fechar</button>
      </div>
    </div>
  );
  const nomeExibido = a.empresa ? `${a.empresa} · ${a.nomeCliente || a.cliente}` : (a.nomeCliente || a.cliente);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 20, width: "100%", maxWidth: 480, padding: 32, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#9ca3af", cursor: "pointer", padding: "4px 12px", fontSize: 13 }}>✕</button>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Como foi o atendimento?</div>
          <div style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>Avalie o atendimento de <strong style={{ color: "#e8eaf0" }}>{nomeExibido}</strong></div>
        </div>
        <div style={{ background: "#1a1d2e", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Atendimento</div>
          <div style={{ fontWeight: 700, color: "#fff", marginTop: 4 }}>{nomeExibido}</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{CANAL_ICONS[a.canal]} {a.canal} · 👤 {a.responsavel}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 12, textAlign: "center" }}>Selecione a nota do cliente:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {NOTAS.map(n => (
              <button key={n} onClick={() => setNota(n)}
                style={{ padding: "16px 12px", borderRadius: 12, border: `2px solid ${nota === n ? "#6366f1" : "#2d3148"}`, background: nota === n ? "#6366f120" : "#1a1d2e", color: nota === n ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 22, fontWeight: 600, transition: "all 0.15s", textAlign: "center" }}>
                <div>{n.split(" ")[0]}</div>
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 500 }}>{n.split(" ").slice(1).join(" ")}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 8 }}>Comentário do cliente (opcional)</label>
          <textarea value={comentario} onChange={e => setComentario(e.target.value)}
            placeholder="O que o cliente disse sobre o atendimento..." rows={3}
            style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 10, color: "#e8eaf0", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <button onClick={() => { if (!nota) return; onSave(a.id, nota, comentario); setEnviado(true); }} disabled={!nota}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: nota ? "pointer" : "not-allowed", background: nota ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1a1d2e", color: nota ? "#fff" : "#4b5563", fontWeight: 700, fontSize: 15, transition: "all 0.2s" }}>
          {nota ? "✅ Registrar Feedback" : "Selecione uma nota para continuar"}
        </button>
      </div>
    </div>
  );
}

function ClienteHistorico({ clienteKey, clientes, onClose, onEdit }: any) {
  const grupo: any = clientes.find((c: any) => (c.empresa || c.nomeCliente).trim().toLowerCase() === clienteKey.trim().toLowerCase());
  if (!grupo) return null;
  const hist = grupo.atendimentos.sort((a: any, b: any) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  const receita = hist.filter((a: any) => a.valorContrato).reduce((s: number, a: any) => s + Number(a.valorContrato), 0);
  const feedbacks = hist.filter((a: any) => a.feedbackNota);
  const notaMap: any = { "😠 Ruim": 1, "😐 Regular": 2, "😊 Bom": 3, "🤩 Ótimo": 4 };
  const avgFeed = feedbacks.length ? (feedbacks.reduce((s: number, a: any) => s + notaMap[a.feedbackNota], 0) / feedbacks.length).toFixed(1) : null;
  const titulo = grupo.empresa ? `${grupo.empresa}${grupo.nomeCliente ? ` · ${grupo.nomeCliente}` : ""}` : grupo.nomeCliente;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "88vh", overflow: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>👤 {titulo}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{hist.length} atendimento(s) registrado(s)</div>
          </div>
          <button onClick={onClose} style={{ background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#9ca3af", cursor: "pointer", padding: "6px 14px", fontSize: 14 }}>✕ Fechar</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Receita total", value: receita > 0 ? formatBRL(receita) : "—", icon: "💰", color: "#10b981" },
            { label: "Avaliação média", value: avgFeed ? `${avgFeed}/4` : "—", icon: "⭐", color: "#f59e0b" },
            { label: "Último contato", value: formatDate(hist[0]?.criadoEm), icon: "🕐", color: "#6366f1" },
          ].map(k => (
            <div key={k.label} style={{ background: "#1a1d2e", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{k.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: "'Space Mono',monospace" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 700, color: "#fff", marginBottom: 14, fontSize: 15 }}>📋 Histórico completo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hist.map((a: any) => {
            const dias = diasRestantes(a.prazoEntrega);
            const prazoColor = dias === null ? null : dias < 0 ? "#ef4444" : dias <= 3 ? "#f59e0b" : "#10b981";
            return (
              <div key={a.id} style={{ background: "#1a1d2e", borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${STATUS_COLORS[a.status]}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{formatDateTime(a.criadoEm)}</span>
                    <span style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{STATUS_ICONS[a.status]} {a.status}</span>
                    {a.feedbackNota && <span style={{ fontSize: 14 }} title={a.feedbackNota}>{a.feedbackNota.split(" ")[0]}</span>}
                  </div>
                  <button onClick={() => { onEdit(a); onClose(); }} style={{ background: "transparent", border: "1px solid #2d3148", borderRadius: 7, color: "#818cf8", cursor: "pointer", padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>✏️ Editar</button>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{CANAL_ICONS[a.canal]} {a.canal} · 👤 {a.responsavel}</div>
                {a.descricao && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6, lineHeight: 1.5 }}>{a.descricao}</div>}
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  {a.valorContrato && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>💰 {formatBRL(a.valorContrato)}{a.tipoContrato ? ` · ${a.tipoContrato}` : ""}</span>}
                  {a.formaPagamento && <span style={{ fontSize: 12, color: "#06b6d4", fontWeight: 600 }}>{FORMA_ICONS[a.formaPagamento]} {a.formaPagamento}{a.bandeira ? ` · ${a.bandeira}` : ""}{a.parcelas && a.parcelas !== "1x" ? ` · ${a.parcelas}` : ""}</span>}
                  {a.valorEntrada && <span style={{ fontSize: 12, color: "#f59e0b" }}>Entrada: {formatBRL(a.valorEntrada)}</span>}
                  {a.modeloCobranca && <span style={{ fontSize: 12, color: "#a78bfa" }}>📋 {a.modeloCobranca}</span>}
                  {a.recorrenciaAutomatica && <span style={{ fontSize: 12, color: "#818cf8" }}>🔄 Recorrente</span>}
                  {a.pagamentoAntecipado && <span style={{ fontSize: 12, color: "#10b981" }}>⚡ Antecipado</span>}
                  {a.prazoEntrega && <span style={{ fontSize: 12, color: prazoColor ?? "#9ca3af", fontWeight: 600 }}>📅 {formatDate(a.prazoEntrega)}{dias !== null ? ` (${dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `${dias}d restantes`})` : ""}</span>}
                  {a.tempoResposta && <span style={{ fontSize: 12, color: "#f59e0b" }}>⚡ Resposta em {formatDuration(a.tempoResposta)}</span>}
                </div>
                {a.observacao && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, fontStyle: "italic" }}>📝 {a.observacao}</div>}
                {a.feedbackComentario && <div style={{ fontSize: 12, color: "#818cf8", marginTop: 6, fontStyle: "italic" }}>"{a.feedbackComentario}"</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AutocompleteCliente({ value, onChange, onSelect, clientes, placeholder }: any) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sugestoes = clientes.filter((c: any) =>
    value.length > 0 && (
      (c.nomeCliente || "").toLowerCase().includes(value.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(value.toLowerCase())
    )
  ).slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input value={value} onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      {aberto && sugestoes.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {sugestoes.map((c: any, i: number) => (
            <div key={i} onMouseDown={() => { onSelect({ nomeCliente: c.nomeCliente || "", empresa: c.empresa || "" }); setAberto(false); }}
              style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #2d3148", display: "flex", flexDirection: "column", gap: 3 }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2d3148")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>{c.nomeCliente}</span>
                {c.empresa && <span style={{ background: "#6366f120", color: "#818cf8", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>🏢 {c.empresa}</span>}
              </div>
              <span style={{ fontSize: 11, color: "#4b5563" }}>{c.atendimentos.length} atendimento(s) · Último: {formatDate(c.atendimentos.sort((a: any, b: any) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0]?.criadoEm)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [filtroCanal, setFiltroCanal] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackAtendimento, setFeedbackAtendimento] = useState<any>(null);
  const [clienteHistoricoKey, setClienteHistoricoKey] = useState<string | null>(null);
  const [periodoDashboard, setPeriodoDashboard] = useState<string>("todos");
  const [periodoAberto, setPeriodoAberto] = useState(false);
  const [anoSeletor, setAnoSeletor] = useState<number>(new Date().getFullYear());
  const [mesSeletor, setMesSeletor] = useState<number | null>(null);
  const [pagamentosRec, setPagamentosRec] = useState<any[]>([]);

  const showToast = (msg: string, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        const r = await (window as any).storage.get("atendimentos_v4");
        if (r && r.value) setAtendimentos(JSON.parse(r.value));
        const rp = await (window as any).storage.get("pagamentos_rec_v1");
        if (rp && rp.value) setPagamentosRec(JSON.parse(rp.value));
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const saveStorage = useCallback(async (data: any[]) => {
    try { await (window as any).storage.set("atendimentos_v4", JSON.stringify(data)); } catch (_) {}
  }, []);

  const savePagRec = useCallback(async (data: any[]) => {
    try { await (window as any).storage.set("pagamentos_rec_v1", JSON.stringify(data)); } catch (_) {}
  }, []);

  const mesAtual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const handleMarcarRecebido = async (atendimentoId: number) => {
    const mes = mesAtual();
    const jaExiste = pagamentosRec.find(p => p.atendimentoId === atendimentoId && p.mes === mes);
    if (jaExiste) { showToast("Pagamento já marcado para este mês!", "err"); return; }
    const at = atendimentos.find(a => a.id === atendimentoId);
    const novo = { id: Date.now(), atendimentoId, mes, valor: at?.valorContrato ? Number(at.valorContrato) : 0, dataRecebido: new Date().toISOString() };
    const updated = [...pagamentosRec, novo];
    setPagamentosRec(updated);
    await savePagRec(updated);
    showToast("✅ Pagamento do mês marcado como recebido!");
  };

  const handleDesfazerRecebido = async (atendimentoId: number) => {
    const mes = mesAtual();
    const updated = pagamentosRec.filter(p => !(p.atendimentoId === atendimentoId && p.mes === mes));
    setPagamentosRec(updated);
    await savePagRec(updated);
    showToast("Pagamento do mês desmarcado.");
  };

  const handleCancelarAssinatura = async (id: number) => {
    const updated = atendimentos.map(a => a.id === id ? { ...a, assinaturaCancelada: true } : a);
    setAtendimentos(updated);
    await saveStorage(updated);
    showToast("Assinatura cancelada.", "err");
  };

  const handleReativarAssinatura = async (id: number) => {
    const updated = atendimentos.map(a => a.id === id ? { ...a, assinaturaCancelada: false } : a);
    setAtendimentos(updated);
    await saveStorage(updated);
    showToast("Assinatura reativada!");
  };

  const handleFeedbackSave = async (id: number, nota: string, comentario: string) => {
    const updated = atendimentos.map(a => a.id === id ? { ...a, feedbackNota: nota, feedbackComentario: comentario, feedbackEm: new Date().toISOString() } : a);
    setAtendimentos(updated); await saveStorage(updated);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d14", color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div><div style={{ opacity: 0.5, fontSize: 14 }}>Carregando...</div></div>
    </div>
  );

  const abrirFeedback = (a: any) => setFeedbackAtendimento(a);
  const fecharFeedback = () => setFeedbackAtendimento(null);

  const handleSubmit = async () => {
    if (!form.nomeCliente || !form.canal || !form.responsavel) { showToast("Preencha Nome do Cliente, Canal e Responsável!", "err"); return; }
    setSalvando(true);
    const totalRespostaMin = (Number(form.tempoRespostaHoras) || 0) * 60 + (Number(form.tempoRespostaMinutos) || 0);
    const totalConclusaoMin = (Number(form.tempoConclusaoHoras) || 0) * 60 + (Number(form.tempoConclusaoMinutos) || 0);
    const parsed = {
      nomeCliente: form.nomeCliente,
      empresa: form.empresa,
      canal: form.canal,
      responsavel: form.responsavel,
      descricao: form.descricao,
      status: form.status,
      tempoResposta: totalRespostaMin > 0 ? totalRespostaMin : null,
      tempoConclusao: totalConclusaoMin > 0 ? totalConclusaoMin : null,
      observacao: form.observacao,
      valorContrato: form.valorContrato ? Number(String(form.valorContrato).replace(",", ".")) : null,
      tipoContrato: form.tipoContrato,
      prazoEntrega: form.prazoEntrega,
      tipoPessoa: form.tipoPessoa,
      cpf: form.cpf,
      cnpj: form.cnpj,
      modeloCobranca: form.modeloCobranca,
      formaPagamento: form.formaPagamento,
      bandeira: form.bandeira,
      parcelas: form.parcelas,
      valorEntrada: form.valorEntrada ? Number(String(form.valorEntrada).replace(",", ".")) : null,
      recorrenciaAutomatica: form.recorrenciaAutomatica,
      pagamentoAntecipado: form.pagamentoAntecipado,
    };
    let updated;
    if (editId) {
      updated = atendimentos.map(a => a.id === editId ? { ...a, ...parsed } : a);
      showToast("Atendimento atualizado!");
    } else {
      updated = [{ ...parsed, id: Date.now(), criadoEm: new Date().toISOString() }, ...atendimentos];
      showToast("Atendimento registrado!");
    }
    setAtendimentos(updated); await saveStorage(updated);
    setForm({ ...EMPTY_FORM }); setEditId(null); setSalvando(false); setTab("lista");
  };

  const handleEdit = (a: any) => {
    const hrs = a.tempoResposta ? Math.floor(a.tempoResposta / 60) : 0;
    const mins = a.tempoResposta ? a.tempoResposta % 60 : 0;
    const chrs = a.tempoConclusao ? Math.floor(a.tempoConclusao / 60) : 0;
    const cmins = a.tempoConclusao ? a.tempoConclusao % 60 : 0;
    setForm({
      ...EMPTY_FORM, ...a,
      tempoRespostaHoras: hrs > 0 ? String(hrs) : "",
      tempoRespostaMinutos: mins > 0 ? String(mins) : "",
      tempoConclusaoHoras: chrs > 0 ? String(chrs) : "",
      tempoConclusaoMinutos: cmins > 0 ? String(cmins) : "",
      valorContrato: a.valorContrato || "",
      tipoPessoa: a.tipoPessoa || "fisica",
      cpf: a.cpf || "",
      cnpj: a.cnpj || "",
      modeloCobranca: a.modeloCobranca || "",
      formaPagamento: a.formaPagamento || "",
      bandeira: a.bandeira || "",
      parcelas: a.parcelas || "",
      valorEntrada: a.valorEntrada || "",
      recorrenciaAutomatica: a.recorrenciaAutomatica || false,
      pagamentoAntecipado: a.pagamentoAntecipado || false,
    });
    setEditId(a.id); setTab("novo");
  };
  const handleDelete = async (id: number) => {
    const updated = atendimentos.filter(a => a.id !== id);
    setAtendimentos(updated); await saveStorage(updated); showToast("Removido.", "err");
  };

  const clientes = getClientes(atendimentos);

  const filtrados = atendimentos.filter(a => {
    const buscaOk = busca === "" || (a.nomeCliente || a.cliente || "").toLowerCase().includes(busca.toLowerCase()) || (a.empresa || "").toLowerCase().includes(busca.toLowerCase()) || (a.responsavel || "").toLowerCase().includes(busca.toLowerCase());
    return (filtroCanal === "Todos" || a.canal === filtroCanal) && (filtroStatus === "Todos" || a.status === filtroStatus) && buscaOk;
  });

  const atendimentosPeriodo = atendimentos.filter(a => {
    if (periodoDashboard === "todos") return true;
    const criadoEm = new Date(a.criadoEm);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    if (periodoDashboard === "hoje") return criadoEm >= inicioHoje;
    if (periodoDashboard === "7dias") { const d = new Date(inicioHoje); d.setDate(d.getDate() - 6); return criadoEm >= d; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(periodoDashboard)) {
      const [y, m, d] = periodoDashboard.split("-").map(Number);
      return criadoEm >= new Date(y, m - 1, d) && criadoEm < new Date(y, m - 1, d + 1);
    }
    if (/^\d{4}-\d{2}$/.test(periodoDashboard)) {
      const [y, m] = periodoDashboard.split("-").map(Number);
      return criadoEm >= new Date(y, m - 1, 1) && criadoEm < new Date(y, m, 1);
    }
    return true;
  });

  const metrics = calcMetrics(atendimentosPeriodo);
  const feedbackRecentes = atendimentosPeriodo.filter(a => a.feedbackNota).sort((x, y) => new Date(y.feedbackEm).getTime() - new Date(x.feedbackEm).getTime()).slice(0, 5);
  const alertasPrazo = [...metrics.atrasados, ...metrics.vencendoHoje].filter((a, i, arr) => arr.findIndex((b: any) => b.id === a.id) === i);
  const respostaClassif = classifyResposta(metrics.avgResposta);

  const pagamentosRecPeriodo = pagamentosRec.filter((p: any) => {
    if (periodoDashboard === "todos") return true;
    const recebido = new Date(p.dataRecebido);
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    if (periodoDashboard === "hoje") return recebido >= inicioHoje;
    if (periodoDashboard === "7dias") { const d = new Date(inicioHoje); d.setDate(d.getDate() - 6); return recebido >= d; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(periodoDashboard)) {
      const [y, m, d] = periodoDashboard.split("-").map(Number);
      return recebido >= new Date(y, m - 1, d) && recebido < new Date(y, m - 1, d + 1);
    }
    if (/^\d{4}-\d{2}$/.test(periodoDashboard)) {
      const [y, m] = periodoDashboard.split("-").map(Number);
      return recebido >= new Date(y, m - 1, 1) && recebido < new Date(y, m, 1);
    }
    return true;
  });
  const receitaConfirmadaRec = pagamentosRecPeriodo.reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
  const receitaTotal = metrics.receitaAvulsa + receitaConfirmadaRec;
  const assinaturasAtivas = atendimentos.filter(a => a.recorrenciaAutomatica && !a.assinaturaCancelada).length;

  const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  const periodoLabel = (() => {
    const agora = new Date();
    const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    if (periodoDashboard === "hoje") return `Hoje, ${fmt(agora)}`;
    if (periodoDashboard === "7dias") { const d = new Date(agora); d.setDate(d.getDate() - 6); return `${fmt(d)} – ${fmt(agora)}`; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(periodoDashboard)) {
      const [y, m, d] = periodoDashboard.split("-").map(Number);
      return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
    }
    if (/^\d{4}-\d{2}$/.test(periodoDashboard)) {
      const [y, m] = periodoDashboard.split("-").map(Number);
      return `${MESES_PT[m - 1]} de ${y}`;
    }
    return "Todo o histórico";
  })();

  const abrirHistorico = (a: any) => {
    const key = chaveCliente(a);
    setClienteHistoricoKey(key);
  };

  const exportarCSV = (dados: any[], nomeArquivo: string) => {
    const escape = (v: any) => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ["Cliente","Empresa","Canal","Status","Responsável","Data","Valor (R$)","Tipo Contrato","Modelo Cobrança","Forma Pagamento","CPF/CNPJ","Recorrente","Observação"];
    const linhas = dados.map(a => [
      a.nomeCliente || a.cliente || "",
      a.empresa || "",
      a.canal || "",
      a.status || "",
      a.responsavel || "",
      a.criadoEm ? new Date(a.criadoEm).toLocaleDateString("pt-BR") : "",
      a.valorContrato || "",
      a.tipoContrato || "",
      a.modeloCobranca || "",
      a.formaPagamento || "",
      a.tipoPessoa === "juridica" ? (a.cnpj || "") : (a.cpf || ""),
      a.recorrenciaAutomatica ? "Sim" : "Não",
      a.observacao || "",
    ].map(escape).join(","));
    const csv = [headers.join(","), ...linhas].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = nomeArquivo; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d14", fontFamily: "'DM Sans',sans-serif", color: "#e8eaf0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {feedbackAtendimento && <FeedbackModal atendimento={feedbackAtendimento} onSave={handleFeedbackSave} onClose={fecharFeedback} />}

      {clienteHistoricoKey && (
        <ClienteHistorico
          clienteKey={clienteHistoricoKey}
          clientes={clientes}
          atendimentos={atendimentos}
          onClose={() => setClienteHistoricoKey(null)}
          onEdit={(a: any) => { handleEdit(a); setTab("novo"); }}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "err" ? "#ef4444" : "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }}>
          {toast.type === "err" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {alertasPrazo.length > 0 && tab === "dashboard" && (
        <div style={{ background: "#ef444415", borderBottom: "1px solid #ef444430", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontWeight: 700, color: "#ef4444", fontSize: 14 }}>
            {metrics.atrasados.length > 0 && `${metrics.atrasados.length} prazo(s) vencido(s)`}
            {metrics.atrasados.length > 0 && metrics.vencendoHoje.length > 0 && " · "}
            {metrics.vencendoHoje.length > 0 && `${metrics.vencendoHoje.length} vencendo em até 3 dias`}
          </span>
          <button onClick={() => setTab("lista")} style={{ marginLeft: "auto", background: "#ef4444", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", padding: "5px 14px", fontSize: 12, fontWeight: 700 }}>Ver agora</button>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2130", padding: "14px 24px", display: "flex", alignItems: "center", background: "#0f1117", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📊</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Fabrika</div>
            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>PAINEL DE GESTÃO · AGÊNCIA</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "dashboard", label: "📈 Dashboard" },
            { id: "novo", label: editId ? "✏️ Editar" : "➕ Novo" },
            { id: "lista", label: "📋 Lista" },
            { id: "assinaturas", label: `🔄 Assinaturas${assinaturasAtivas > 0 ? ` (${assinaturasAtivas})` : ""}` },
            { id: "clientes", label: `👥 Clientes (${clientes.length})` },
            { id: "feedbacks", label: `⭐ Feedbacks${metrics.feedbackCount > 0 ? ` (${metrics.feedbackCount})` : ""}` },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id !== "novo") { setForm({ ...EMPTY_FORM }); setEditId(null); } }}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1a1d2e", color: tab === t.id ? "#fff" : "#9ca3af", transition: "all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Visão Geral</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2, display: "flex", alignItems: "center", gap: 10 }}>
                  <span>
                    {atendimentosPeriodo.length} atendimento(s)
                    {periodoDashboard !== "todos" && <span style={{ color: "#4b5563" }}> no período</span>}
                    {periodoDashboard === "todos" && <span> · {clientes.length} cliente(s)</span>}
                  </span>
                  {atendimentosPeriodo.length > 0 && (
                    <button onClick={() => exportarCSV(atendimentosPeriodo, `fabrika-dashboard-${periodoLabel.replace(/\s/g,"-")}.csv`)}
                      style={{ padding: "3px 10px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 6, color: "#6b7280", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      ⬇ Exportar CSV
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {/* Barra compacta sempre visível */}
                <div style={{ display: "flex", gap: 4, background: "#0f1117", border: "1px solid #1e2130", borderRadius: 10, padding: 4 }}>
                  {([{ key: "hoje", label: "Hoje" }, { key: "7dias", label: "7 Dias" }] as const).map(({ key, label }) => {
                    const ativo = periodoDashboard === key;
                    return (
                      <button key={key} onClick={() => { setPeriodoDashboard(key); setPeriodoAberto(false); }}
                        style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                          background: ativo ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                          color: ativo ? "#fff" : "#6b7280" }}>
                        {label}
                      </button>
                    );
                  })}
                  {/* Botão Período — abre o picker */}
                  <button onClick={() => { setPeriodoAberto(v => !v); }}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                      background: periodoAberto || /^\d{4}/.test(periodoDashboard) ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                      color: periodoAberto || /^\d{4}/.test(periodoDashboard) ? "#fff" : "#6b7280" }}>
                    Período {periodoAberto ? "▲" : "▼"}
                  </button>
                  <button onClick={() => { setPeriodoDashboard("todos"); setPeriodoAberto(false); setMesSeletor(null); }}
                    style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                      background: periodoDashboard === "todos" && !periodoAberto ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                      color: periodoDashboard === "todos" && !periodoAberto ? "#fff" : "#6b7280" }}>
                    Tudo
                  </button>
                </div>

                {/* Label do período ativo */}
                <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "'Space Mono',monospace" }}>
                  📅 {periodoLabel}
                </div>

                {/* Picker expandido — só aparece quando "Período" está aberto */}
                {periodoAberto && (() => {
                  const agora = new Date();
                  const diasNoMes = mesSeletor !== null ? new Date(anoSeletor, mesSeletor + 1, 0).getDate() : 0;
                  const mesChave = mesSeletor !== null ? `${anoSeletor}-${String(mesSeletor + 1).padStart(2,"0")}` : null;

                  return (
                    <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "14px", width: 280 }}>
                      {/* Navegação de ano */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <button onClick={() => { setAnoSeletor(a => a - 1); setMesSeletor(null); }}
                          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, padding: "0 8px", lineHeight: 1 }}>‹</button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#c4c9d8", letterSpacing: 1 }}>{anoSeletor}</span>
                        <button onClick={() => { setAnoSeletor(a => a + 1); setMesSeletor(null); }}
                          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, padding: "0 8px", lineHeight: 1 }}>›</button>
                      </div>

                      {/* Grid de meses */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: mesSeletor !== null ? 10 : 0 }}>
                        {MESES_ABREV.map((mes, i) => {
                          const isFuturo = anoSeletor > agora.getFullYear() || (anoSeletor === agora.getFullYear() && i > agora.getMonth());
                          const chave = `${anoSeletor}-${String(i + 1).padStart(2,"0")}`;
                          const ativoMes = mesSeletor === i || (periodoDashboard === chave && mesSeletor === null);
                          return (
                            <button key={mes} onClick={() => {
                              if (isFuturo) return;
                              setMesSeletor(i);
                              setPeriodoDashboard(chave);
                            }}
                              style={{ padding: "6px 0", borderRadius: 7, border: ativoMes ? "1px solid #6366f1" : "1px solid transparent",
                                cursor: isFuturo ? "default" : "pointer", fontSize: 12, fontWeight: ativoMes ? 700 : 500,
                                background: ativoMes ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#161926",
                                color: ativoMes ? "#fff" : isFuturo ? "#2d3347" : "#9ca3af",
                                transition: "all 0.12s" }}>
                              {mes}
                            </button>
                          );
                        })}
                      </div>

                      {/* Grid de dias — aparece quando um mês está selecionado */}
                      {mesSeletor !== null && (
                        <>
                          <div style={{ borderTop: "1px solid #1e2130", paddingTop: 10, marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>{MESES_PT[mesSeletor]} — escolha o dia</span>
                              <button onClick={() => { setMesSeletor(null); setPeriodoDashboard(mesChave!); }}
                                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 11 }}>× limpar dia</button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                              {Array.from({ length: diasNoMes }, (_, idx) => {
                                const dia = idx + 1;
                                const chaveDia = `${anoSeletor}-${String(mesSeletor + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
                                const isFuturoDia = anoSeletor > agora.getFullYear() ||
                                  (anoSeletor === agora.getFullYear() && mesSeletor > agora.getMonth()) ||
                                  (anoSeletor === agora.getFullYear() && mesSeletor === agora.getMonth() && dia > agora.getDate());
                                const ativoDia = periodoDashboard === chaveDia;
                                return (
                                  <button key={dia} onClick={() => !isFuturoDia && setPeriodoDashboard(chaveDia)}
                                    style={{ padding: "5px 0", borderRadius: 5, border: ativoDia ? "1px solid #6366f1" : "1px solid transparent",
                                      cursor: isFuturoDia ? "default" : "pointer", fontSize: 11, fontWeight: ativoDia ? 700 : 400,
                                      background: ativoDia ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#161926",
                                      color: ativoDia ? "#fff" : isFuturoDia ? "#2d3347" : "#9ca3af",
                                      transition: "all 0.1s" }}>
                                    {dia}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Cards de Receita em destaque */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
              <div style={{ background: "linear-gradient(135deg,#064e3b,#065f46)", border: "1px solid #10b98140", borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 72, opacity: 0.08 }}>💰</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Receita Total Confirmada</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#10b981", fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
                  {receitaTotal > 0 ? formatBRL(receitaTotal) : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#6ee7b7", marginTop: 8, opacity: 0.7 }}>Avulsa + recorrências recebidas</div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#1e1b4b,#2e1065)", border: "1px solid #818cf840", borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 72, opacity: 0.08 }}>🔄</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Recorrente Confirmado</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#818cf8", fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
                  {receitaConfirmadaRec > 0 ? formatBRL(receitaConfirmadaRec) : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#a5b4fc", marginTop: 8, opacity: 0.7 }}>
                  Pagamentos recebidos no período
                </div>
                {metrics.receitaRecorrente > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: "#6d7bbf" }}>
                    Esperado: {formatBRL(metrics.receitaRecorrente)}/mês ({assinaturasAtivas} ativa{assinaturasAtivas !== 1 ? "s" : ""})
                  </div>
                )}
              </div>
              <div style={{ background: "linear-gradient(135deg,#1c1917,#292524)", border: "1px solid #f59e0b40", borderRadius: 14, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 72, opacity: 0.08 }}>🧾</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#fcd34d", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Receita Avulsa</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>
                  {metrics.receitaAvulsa > 0 ? formatBRL(metrics.receitaAvulsa) : "—"}
                </div>
                <div style={{ fontSize: 12, color: "#fcd34d", marginTop: 8, opacity: 0.7 }}>Projetos e contratos únicos</div>
              </div>
            </div>

            {/* Demais métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total de Atendimentos", value: metrics.total, icon: "📥", color: "#6366f1", sub: null },
                {
                  label: "Tempo Médio de Resposta",
                  value: metrics.avgResposta ? formatDuration(metrics.avgResposta) : "—",
                  icon: "⚡",
                  color: respostaClassif ? respostaClassif.color : "#f59e0b",
                  sub: respostaClassif ? respostaClassif.label : null,
                },
                { label: "Tempo Médio de Conclusão", value: metrics.avgConclusao ? formatDuration(metrics.avgConclusao) : "—", icon: "⏱️", color: "#3b82f6", sub: null },
                { label: "Taxa de Atendimentos Perdidos", value: `${metrics.taxaPerdido}%`, icon: "❌", color: "#ef4444", sub: null },
                { label: "Taxa de Conclusão", value: `${metrics.taxaConclusao}%`, icon: "✅", color: "#10b981", sub: null },
              ].map(k => (
                <div key={k.label} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -8, right: -8, fontSize: 52, opacity: 0.05 }}>{k.icon}</div>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: k.color, fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>{k.value}</div>
                  {k.sub && (
                    <div style={{ marginTop: 4, display: "inline-block", background: k.color + "22", color: k.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                      {k.sub}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, lineHeight: 1.4 }}>{k.label}</div>
                  {k.label === "Tempo Médio de Resposta" && metrics.avgResposta && (
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>
                      {metrics.avgResposta < 60
                        ? `≤ ${metrics.avgResposta} min desde o primeiro contato`
                        : `${Math.floor(metrics.avgResposta / 60)}h ${metrics.avgResposta % 60}min desde o primeiro contato`}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {alertasPrazo.length > 0 && (
              <div style={{ background: "#0f1117", border: "1px solid #ef444430", borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 14, color: "#ef4444", fontSize: 15 }}>🚨 Prazos que precisam de atenção</div>
                {alertasPrazo.map((a: any) => {
                  const dias = diasRestantes(a.prazoEntrega);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1a1d2e" }}>
                      <div style={{ fontSize: 20 }}>{CANAL_ICONS[a.canal]}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.empresa ? `${a.empresa} · ` : ""}{a.nomeCliente || a.cliente}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{a.responsavel} · Prazo: {formatDate(a.prazoEntrega)}</div>
                      </div>
                      <div style={{ background: dias! < 0 ? "#ef444422" : "#f59e0b22", color: dias! < 0 ? "#ef4444" : "#f59e0b", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>
                        {dias! < 0 ? `${Math.abs(dias!)}d atrasado` : dias === 0 ? "Vence hoje" : `${dias}d restantes`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>📡 Por Canal</div>
                {CANAIS.map(c => { const count = metrics.porCanal[c]; const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0; return (
                  <div key={c} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}><span>{CANAL_ICONS[c]} {c}</span><span style={{ fontFamily: "'Space Mono',monospace", color: "#9ca3af" }}>{count}</span></div>
                    <div style={{ height: 6, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.5s ease" }} /></div>
                  </div>
                ); })}
              </div>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🔖 Por Status</div>
                {STATUS.map(s => { const count = metrics.porStatus[s]; const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0; return (
                  <div key={s} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[s], display: "inline-block" }} />{STATUS_ICONS[s]} {s}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", color: "#9ca3af" }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLORS[s], borderRadius: 99, opacity: 0.9, transition: "width 0.5s ease" }} /></div>
                  </div>
                ); })}
              </div>
            </div>

            {feedbackRecentes.length > 0 && (
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>⭐ Feedbacks Recentes</div>
                {feedbackRecentes.map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #1a1d2e" }}>
                    <div style={{ fontSize: 26 }}>{a.feedbackNota.split(" ")[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.empresa ? `${a.empresa} · ` : ""}{a.nomeCliente || a.cliente} <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 13 }}>· {a.feedbackNota.split(" ").slice(1).join(" ")}</span></div>
                      {a.feedbackComentario && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, fontStyle: "italic" }}>"{a.feedbackComentario}"</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>{formatDate(a.feedbackEm)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🕐 Últimos Registros</div>
              {atendimentosPeriodo.slice(0, 5).length === 0
                ? <div style={{ color: "#4b5563", textAlign: "center", padding: "20px 0", fontSize: 14 }}>Nenhum atendimento{periodoDashboard !== "todos" ? " neste período" : " ainda"}.</div>
                : atendimentosPeriodo.slice(0, 5).map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #1a1d2e" }}>
                    <div style={{ fontSize: 22 }}>{CANAL_ICONS[a.canal]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#818cf8" }} onClick={() => abrirHistorico(a)}>
                        {a.empresa ? <span><span style={{ color: "#fff" }}>{a.empresa}</span> · {a.nomeCliente}</span> : a.nomeCliente || a.cliente} ↗️
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{a.canal} · {a.responsavel} · {formatDateTime(a.criadoEm)}</div>
                    </div>
                    {a.valorContrato && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>{formatBRL(a.valorContrato)}</span>}
                    <div style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], border: `1px solid ${STATUS_COLORS[a.status]}44`, borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{STATUS_ICONS[a.status]} {a.status}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── NOVO / EDITAR ── */}
        {tab === "novo" && (
          <div style={{ maxWidth: 660, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{editId ? "✏️ Editar Atendimento" : "➕ Novo Atendimento"}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>Preencha os dados do atendimento</div>
            </div>
            <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 28 }}>

              {/* Identificação */}
              <div style={{ background: "#6366f108", border: "1px solid #6366f120", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: "#818cf8", fontSize: 14, marginBottom: 14 }}>👤 Identificação</div>

                {/* Tipo de Pessoa */}
                <div style={{ marginBottom: 14 }}>
                  <Label>Tipo de Pessoa</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["fisica", "juridica"] as const).map(tipo => (
                      <button key={tipo} onClick={() => setForm(p => ({ ...p, tipoPessoa: tipo, cpf: "", cnpj: "" }))}
                        style={{ flex: 1, padding: "10px 14px", borderRadius: 9, border: `1px solid ${form.tipoPessoa === tipo ? "#6366f1" : "#2d3148"}`, background: form.tipoPessoa === tipo ? "#6366f120" : "#1a1d2e", color: form.tipoPessoa === tipo ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s", textAlign: "center" }}>
                        {tipo === "fisica" ? "👤 Pessoa Física" : "🏢 Pessoa Jurídica"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <Label>Nome do Cliente *</Label>
                    <AutocompleteCliente
                      value={form.nomeCliente}
                      onChange={(val: string) => setForm(p => ({ ...p, nomeCliente: val }))}
                      onSelect={({ nomeCliente, empresa }: any) => setForm(p => ({ ...p, nomeCliente, empresa }))}
                      clientes={clientes}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Field value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} placeholder="Ex: Nil Modas" />
                  </div>
                </div>

                {/* CPF ou CNPJ */}
                <div style={{ marginTop: 14 }}>
                  {form.tipoPessoa === "fisica" ? (
                    <div>
                      <Label>CPF</Label>
                      <Field
                        value={form.cpf}
                        onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>CNPJ</Label>
                      <Field
                        value={form.cnpj}
                        onChange={e => setForm(p => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Responsável *</Label>
                <Field value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} placeholder="Quem está atendendo" />
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Canal de Entrada *</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CANAIS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, canal: c }))}
                      style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${form.canal === c ? "#6366f1" : "#2d3148"}`, background: form.canal === c ? "#6366f120" : "#1a1d2e", color: form.canal === c ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                      {CANAL_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Descrição</Label>
                <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="O que foi solicitado..." rows={3}
                  style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Status</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {STATUS.map(s => (
                    <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))}
                      style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${form.status === s ? STATUS_COLORS[s] : "#2d3148"}`, background: form.status === s ? STATUS_COLORS[s] + "22" : "#1a1d2e", color: form.status === s ? STATUS_COLORS[s] : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                      {STATUS_ICONS[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrato & Pagamento */}
              <div style={{ background: "#10b98108", border: "1px solid #10b98120", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#10b981", fontSize: 14, marginBottom: 14 }}>💰 Contrato & Pagamento</div>

                {/* Modelo de cobrança */}
                <div style={{ marginBottom: 14 }}>
                  <Label>Modelo de Cobrança</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {MODELOS_COBRANCA.map(m => (
                      <button key={m} onClick={() => setForm(p => ({ ...p, modeloCobranca: p.modeloCobranca === m ? "" : m }))}
                        style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${form.modeloCobranca === m ? "#10b981" : "#2d3148"}`, background: form.modeloCobranca === m ? "#10b98122" : "#1a1d2e", color: form.modeloCobranca === m ? "#10b981" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor + Tipo */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <Label>Valor Total (R$)</Label>
                    <Field type="number" min="0" value={form.valorContrato} onChange={e => setForm(p => ({ ...p, valorContrato: e.target.value }))} placeholder="Ex: 1500" />
                  </div>
                  <div>
                    <Label>Tipo de Contrato</Label>
                    <select value={form.tipoContrato} onChange={e => setForm(p => ({ ...p, tipoContrato: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: form.tipoContrato ? "#e8eaf0" : "#374151", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                      <option value="">Selecione...</option>
                      {TIPOS_CONTRATO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div style={{ marginBottom: 14 }}>
                  <Label>Forma de Pagamento</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {FORMAS_PAGAMENTO.map(f => (
                      <button key={f} onClick={() => setForm(p => ({ ...p, formaPagamento: p.formaPagamento === f ? "" : f, bandeira: "", parcelas: "" }))}
                        style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${form.formaPagamento === f ? "#10b981" : "#2d3148"}`, background: form.formaPagamento === f ? "#10b98122" : "#1a1d2e", color: form.formaPagamento === f ? "#10b981" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                        {FORMA_ICONS[f]} {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bandeira — só para cartão */}
                {(form.formaPagamento === "Cartão de Débito" || form.formaPagamento === "Cartão de Crédito") && (
                  <div style={{ marginBottom: 14 }}>
                    <Label>Bandeira do Cartão</Label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {BANDEIRAS.map(b => (
                        <button key={b} onClick={() => setForm(p => ({ ...p, bandeira: p.bandeira === b ? "" : b }))}
                          style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${form.bandeira === b ? "#818cf8" : "#2d3148"}`, background: form.bandeira === b ? "#6366f122" : "#1a1d2e", color: form.bandeira === b ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parcelas — só para cartão de crédito */}
                {form.formaPagamento === "Cartão de Crédito" && (
                  <div style={{ marginBottom: 14 }}>
                    <Label>Parcelamento</Label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["1x", "2x", "3x", "4x", "5x", "6x"].map(p => (
                        <button key={p} onClick={() => setForm(f => ({ ...f, parcelas: f.parcelas === p ? "" : p }))}
                          style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `1px solid ${form.parcelas === p ? "#818cf8" : "#2d3148"}`, background: form.parcelas === p ? "#6366f122" : "#1a1d2e", color: form.parcelas === p ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "center", transition: "all 0.15s" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entrada */}
                <div style={{ marginBottom: 14 }}>
                  <Label>Valor de Entrada (R$) — opcional</Label>
                  <Field type="number" min="0" value={form.valorEntrada} onChange={e => setForm(p => ({ ...p, valorEntrada: e.target.value }))} placeholder="Ex: 500" />
                  {form.valorEntrada && form.valorContrato && Number(form.valorEntrada) < Number(form.valorContrato) && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      Restante: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{formatBRL(Number(form.valorContrato) - Number(form.valorEntrada))}</span>
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={form.recorrenciaAutomatica} onChange={e => setForm(p => ({ ...p, recorrenciaAutomatica: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>🔄 <strong style={{ color: "#e8eaf0" }}>Recorrência automática</strong></span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={form.pagamentoAntecipado} onChange={e => setForm(p => ({ ...p, pagamentoAntecipado: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer" }} />
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>⚡ <strong style={{ color: "#e8eaf0" }}>Pagamento antecipado</strong></span>
                  </label>
                </div>
              </div>

              {/* Prazo de Entrega */}
              <div style={{ background: "#3b82f608", border: "1px solid #3b82f620", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#3b82f6", fontSize: 14, marginBottom: 14 }}>📅 Prazo de Entrega</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <Label>Data limite</Label>
                    <Field type="date" value={form.prazoEntrega} onChange={e => setForm(p => ({ ...p, prazoEntrega: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                    {form.prazoEntrega && (() => {
                      const dias = diasRestantes(form.prazoEntrega);
                      const cor = dias! < 0 ? "#ef4444" : dias! <= 3 ? "#f59e0b" : "#10b981";
                      return <div style={{ background: cor + "22", border: `1px solid ${cor}44`, borderRadius: 10, padding: "8px 16px", color: cor, fontWeight: 700, fontSize: 13 }}>
                        {dias! < 0 ? `⚠️ ${Math.abs(dias!)}d atrasado` : dias === 0 ? "📌 Vence hoje" : `📅 ${dias} dias restantes`}
                      </div>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Tempos */}
              <div style={{ background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: 14, marginBottom: 14 }}>⏱️ Tempos de Atendimento</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>⚡ Tempo de Resposta</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>Quanto tempo levou para responder o cliente após o primeiro contato</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <Label>Horas</Label>
                        <Field type="number" min="0" value={form.tempoRespostaHoras} onChange={e => setForm(p => ({ ...p, tempoRespostaHoras: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <Label>Minutos</Label>
                        <Field type="number" min="0" value={form.tempoRespostaMinutos} onChange={e => setForm(p => ({ ...p, tempoRespostaMinutos: String(Math.min(59, Number(e.target.value))) }))} placeholder="0" />
                      </div>
                    </div>
                    {(form.tempoRespostaHoras || form.tempoRespostaMinutos) && (() => {
                      const total = (Number(form.tempoRespostaHoras) || 0) * 60 + (Number(form.tempoRespostaMinutos) || 0);
                      const cl = classifyResposta(total);
                      return cl ? <div style={{ marginTop: 8, display: "inline-block", background: cl.color + "22", color: cl.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{cl.label}</div> : null;
                    })()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>⏱️ Tempo de Conclusão</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>Quanto tempo levou para concluir o atendimento do início ao fim</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <Label>Horas</Label>
                        <Field type="number" min="0" value={form.tempoConclusaoHoras} onChange={e => setForm(p => ({ ...p, tempoConclusaoHoras: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <Label>Minutos</Label>
                        <Field type="number" min="0" value={form.tempoConclusaoMinutos} onChange={e => setForm(p => ({ ...p, tempoConclusaoMinutos: String(Math.min(59, Number(e.target.value))) }))} placeholder="0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <Label>📝 Observações</Label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Próximos passos, anotações..." rows={2}
                  style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleSubmit} disabled={salvando}
                  style={{ flex: 1, padding: 13, borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 15, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? "Salvando..." : editId ? "💾 Salvar Alterações" : "✅ Registrar Atendimento"}
                </button>
                <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setTab("lista"); }}
                  style={{ padding: "13px 20px", borderRadius: 10, border: "1px solid #2d3148", cursor: "pointer", background: "transparent", color: "#9ca3af", fontWeight: 600, fontSize: 14 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── LISTA ── */}
        {tab === "lista" && (
          <div>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>📋 Todos os Atendimentos</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{filtrados.length} resultado(s)</div>
              </div>
              {filtrados.length > 0 && (
                <button onClick={() => exportarCSV(filtrados, `fabrika-lista-${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.csv`)}
                  style={{ padding: "8px 16px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer", alignSelf: "center", display: "flex", alignItems: "center", gap: 6 }}>
                  ⬇ Exportar CSV
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#6b7280" }}>🔍</span>
                <input value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por cliente, empresa ou responsável..."
                  style={{ width: "100%", padding: "9px 14px 9px 38px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} style={{ padding: "8px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#e8eaf0", fontSize: 13, cursor: "pointer" }}>
                <option>Todos</option>{CANAIS.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: "8px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#e8eaf0", fontSize: 13, cursor: "pointer" }}>
                <option>Todos</option>{STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => setTab("novo")} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>+ Novo</button>
            </div>
            {filtrados.length === 0 ? (
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ color: "#4b5563" }}>{busca ? `Nenhum resultado para "${busca}"` : "Nenhum atendimento encontrado."}</div>
                {!busca && <button onClick={() => setTab("novo")} style={{ marginTop: 16, padding: "10px 24px", background: "#6366f1", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer" }}>Registrar primeiro atendimento</button>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtrados.map((a: any) => {
                  const dias = diasRestantes(a.prazoEntrega);
                  const prazoColor = dias === null ? null : dias < 0 ? "#ef4444" : dias <= 3 ? "#f59e0b" : "#10b981";
                  return (
                    <div key={a.id} style={{ background: "#0f1117", border: `1px solid ${dias !== null && dias < 0 ? "#ef444430" : "#1e2130"}`, borderRadius: 13, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ fontSize: 26, lineHeight: 1.2 }}>{CANAL_ICONS[a.canal]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#818cf8" }} onClick={() => abrirHistorico(a)}>
                            {a.empresa ? <>{a.empresa} <span style={{ color: "#6b7280", fontWeight: 400 }}>· {a.nomeCliente}</span></> : (a.nomeCliente || a.cliente)} ↗️
                          </span>
                          <span style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], border: `1px solid ${STATUS_COLORS[a.status]}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{STATUS_ICONS[a.status]} {a.status}</span>
                          {a.feedbackNota && <span style={{ fontSize: 14 }} title={a.feedbackNota}>{a.feedbackNota.split(" ")[0]}</span>}
                          {a.tipoPessoa === "fisica" && a.cpf && <span style={{ fontSize: 11, color: "#6b7280", background: "#1a1d2e", borderRadius: 6, padding: "1px 7px" }}>CPF: {a.cpf}</span>}
                          {a.tipoPessoa === "juridica" && a.cnpj && <span style={{ fontSize: 11, color: "#6b7280", background: "#1a1d2e", borderRadius: 6, padding: "1px 7px" }}>CNPJ: {a.cnpj}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{a.canal} · 👤 {a.responsavel} · 🕐 {formatDateTime(a.criadoEm)}</div>
                        {a.descricao && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 5, lineHeight: 1.5 }}>{a.descricao}</div>}
                        <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {a.valorContrato && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>💰 {formatBRL(a.valorContrato)}{a.tipoContrato ? ` · ${a.tipoContrato}` : ""}</span>}
                          {a.prazoEntrega && <span style={{ fontSize: 12, color: prazoColor ?? "#9ca3af", fontWeight: 600 }}>📅 {formatDate(a.prazoEntrega)}{dias !== null ? ` · ${dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `${dias}d`}` : ""}</span>}
                          {a.tempoResposta && <span style={{ fontSize: 12, color: "#f59e0b" }}>⚡ Resp. {formatDuration(a.tempoResposta)}</span>}
                          {a.observacao && <span style={{ fontSize: 12, color: "#6b7280" }}>📝 {a.observacao}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => abrirFeedback(a)}
                          style={{ padding: "6px 12px", background: a.feedbackNota ? "#10b98122" : "#1a1d2e", border: `1px solid ${a.feedbackNota ? "#10b981" : "#2d3148"}`, borderRadius: 7, color: a.feedbackNota ? "#10b981" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {a.feedbackNota ? "⭐ Ver feedback" : "⭐ Feedback"}
                        </button>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleEdit(a)} style={{ flex: 1, padding: "6px 10px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 7, color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️</button>
                          <button onClick={() => handleDelete(a.id)} style={{ padding: "6px 10px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab === "clientes" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>👥 Clientes</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{clientes.length} cliente(s) cadastrado(s)</div>
            </div>
            {clientes.length === 0 ? (
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <div style={{ color: "#4b5563" }}>Nenhum cliente ainda. Registre atendimentos para ver aqui.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
                {(clientes as any[]).map(c => {
                  const ids = new Set(c.atendimentos.map((a: any) => a.id));
                  const recAvulsa = c.atendimentos.filter((a: any) => a.valorContrato && !a.recorrenciaAutomatica).reduce((s: number, a: any) => s + Number(a.valorContrato), 0);
                  const recConfirmadaRec = pagamentosRec.filter((p: any) => ids.has(p.atendimentoId)).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
                  const ltv = recAvulsa + recConfirmadaRec;
                  const assinaturaAtiva = c.atendimentos.find((a: any) => a.recorrenciaAutomatica && !a.assinaturaCancelada);
                  const recEsperada = c.atendimentos.filter((a: any) => a.recorrenciaAutomatica && !a.assinaturaCancelada).reduce((s: number, a: any) => s + Number(a.valorContrato || 0), 0);
                  const ultimo = c.atendimentos.sort((a: any, b: any) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0];
                  const feedbacks = c.atendimentos.filter((a: any) => a.feedbackNota);
                  const notaMap: any = { "😠 Ruim": 1, "😐 Regular": 2, "😊 Bom": 3, "🤩 Ótimo": 4 };
                  const avgFeed = feedbacks.length ? (feedbacks.reduce((s: number, a: any) => s + notaMap[a.feedbackNota], 0) / feedbacks.length).toFixed(1) : null;
                  const prazoUrgente = c.atendimentos.find((a: any) => { const d = diasRestantes(a.prazoEntrega); return d !== null && d <= 3 && a.status !== "Concluído"; });
                  const statusAtual = ultimo?.status;
                  const titulo = c.empresa || c.nomeCliente;
                  const subtitulo = c.empresa ? c.nomeCliente : "";
                  return (
                    <div key={titulo} style={{ background: "#0f1117", border: `1px solid ${prazoUrgente ? "#ef444430" : "#1e2130"}`, borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.2s" }}
                      onClick={() => setClienteHistoricoKey((c.empresa || c.nomeCliente).trim().toLowerCase())}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{titulo}</div>
                          {subtitulo && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>👤 {subtitulo}</div>}
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{c.atendimentos.length} atendimento(s) · Último: {formatDate(ultimo?.criadoEm)}</div>
                        </div>
                        {statusAtual && <div style={{ background: STATUS_COLORS[statusAtual] + "22", color: STATUS_COLORS[statusAtual], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{STATUS_ICONS[statusAtual]}</div>}
                      </div>

                      {/* Resumo financeiro */}
                      {ltv > 0 && (
                        <div style={{ background: "#0a0c12", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Resumo Financeiro</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", fontFamily: "'Space Mono',monospace" }}>{formatBRL(ltv)}</div>
                              <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>LTV total gerado</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              {recAvulsa > 0 && <div style={{ fontSize: 11, color: "#f59e0b" }}>Avulso: {formatBRL(recAvulsa)}</div>}
                              {recConfirmadaRec > 0 && <div style={{ fontSize: 11, color: "#818cf8" }}>Rec. confirmado: {formatBRL(recConfirmadaRec)}</div>}
                            </div>
                          </div>
                          {assinaturaAtiva && recEsperada > 0 && (
                            <div style={{ marginTop: 8, borderTop: "1px solid #1e2130", paddingTop: 7, display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ background: "#818cf820", color: "#818cf8", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>🔄 ASSINATURA ATIVA</span>
                              <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>{formatBRL(recEsperada)}/mês</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {avgFeed && <div style={{ background: "#f59e0b15", borderRadius: 8, padding: "5px 12px", fontSize: 13, color: "#f59e0b", fontWeight: 700 }}>⭐ {avgFeed}/4</div>}
                        {prazoUrgente && <div style={{ background: "#ef444415", borderRadius: 8, padding: "5px 12px", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>🚨 Prazo urgente</div>}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>Ver histórico completo <span style={{ color: "#6366f1" }}>→</span></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ASSINATURAS ── */}
        {tab === "assinaturas" && (() => {
          const todas = atendimentos.filter(a => a.recorrenciaAutomatica);
          const ativas = todas.filter(a => !a.assinaturaCancelada);
          const canceladas = todas.filter(a => a.assinaturaCancelada);
          const mes = mesAtual();
          const recebidoMes = pagamentosRec.filter(p => p.mes === mes).reduce((s: number, p: any) => s + Number(p.valor || 0), 0);
          const pendentesMes = ativas.filter(a => !pagamentosRec.find(p => p.atendimentoId === a.id && p.mes === mes));

          const AssinaturaRow = ({ a }: { a: any }) => {
            const cancelada = a.assinaturaCancelada;
            const pago = pagamentosRec.find((p: any) => p.atendimentoId === a.id && p.mes === mes);
            const ultimos6 = [0,1,2,3,4,5].map(offset => {
              const d = new Date(); d.setMonth(d.getMonth() - offset);
              const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
              const p = pagamentosRec.find((p: any) => p.atendimentoId === a.id && p.mes === m);
              return { m, label: d.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}), pago: !!p, data: p?.dataRecebido };
            });
            return (
              <div style={{ background: "#0f1117", border: `1px solid ${cancelada ? "#ef444420" : "#1e2130"}`, borderRadius: 12, padding: "18px 20px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: cancelada ? "#6b7280" : "#fff" }}>
                        {a.empresa || a.nomeCliente}
                      </span>
                      {a.empresa && <span style={{ fontSize: 12, color: "#9ca3af" }}>· {a.nomeCliente}</span>}
                      {cancelada
                        ? <span style={{ background: "#ef444420", color: "#ef4444", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>CANCELADA</span>
                        : pago
                          ? <span style={{ background: "#10b98120", color: "#10b981", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>✅ RECEBIDO</span>
                          : <span style={{ background: "#f59e0b20", color: "#f59e0b", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>⏳ PENDENTE</span>
                      }
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#6b7280" }}>
                      {a.valorContrato && <span style={{ color: "#818cf8", fontWeight: 700 }}>{formatBRL(a.valorContrato)}/mês</span>}
                      {a.modeloCobranca && <span>📋 {a.modeloCobranca}</span>}
                      {a.formaPagamento && <span>{FORMA_ICONS[a.formaPagamento]} {a.formaPagamento}{a.bandeira ? ` · ${a.bandeira}` : ""}</span>}
                    </div>
                    {pago && <div style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>Recebido em {formatDateTime(pago.dataRecebido)}</div>}
                  </div>

                  {/* Histórico 6 meses */}
                  <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                    {ultimos6.reverse().map(({ m, label, pago: pg, data }) => (
                      <div key={m} title={pg && data ? `Recebido em ${formatDateTime(data)}` : `Pendente — ${label}`}
                        style={{ textAlign: "center", opacity: cancelada ? 0.35 : 1 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: pg ? "#10b98122" : "#1a1d2e", border: `1px solid ${pg ? "#10b981" : "#2d3148"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 4 }}>
                          {pg ? "✅" : "○"}
                        </div>
                        <div style={{ fontSize: 9, color: "#4b5563", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, alignSelf: "center" }}>
                    {!cancelada && (
                      pago
                        ? <button onClick={() => handleDesfazerRecebido(a.id)}
                            style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid #10b98140", background: "#10b98115", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                            ✅ Recebido
                          </button>
                        : <button onClick={() => handleMarcarRecebido(a.id)}
                            style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid #6366f150", background: "#6366f115", color: "#818cf8", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                            Marcar recebido
                          </button>
                    )}
                    {cancelada
                      ? <button onClick={() => handleReativarAssinatura(a.id)}
                          style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid #10b98140", background: "#10b98115", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          Reativar
                        </button>
                      : <button onClick={() => handleCancelarAssinatura(a.id)}
                          style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid #ef444430", background: "#ef444410", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          Cancelar
                        </button>
                    }
                  </div>
                </div>
              </div>
            );
          };

          return (
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>🔄 Assinaturas Recorrentes</div>
                  <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{ativas.length} ativa(s) · {canceladas.length} cancelada(s)</div>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", background: "#0f1117", border: "1px solid #1e2130", borderRadius: 10, padding: "8px 16px" }}>
                  {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </div>
              </div>

              {/* Resumo do mês */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "linear-gradient(135deg,#064e3b,#065f46)", border: "1px solid #10b98140", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Recebido este mês</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#10b981", fontFamily: "'Space Mono',monospace" }}>{recebidoMes > 0 ? formatBRL(recebidoMes) : "—"}</div>
                </div>
                <div style={{ background: "linear-gradient(135deg,#1e1b4b,#2e1065)", border: "1px solid #818cf840", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Esperado / mês</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#818cf8", fontFamily: "'Space Mono',monospace" }}>{metrics.receitaRecorrente > 0 ? formatBRL(metrics.receitaRecorrente) : "—"}</div>
                </div>
                <div style={{ background: pendentesMes.length > 0 ? "linear-gradient(135deg,#431407,#7c2d12)" : "#0f1117", border: `1px solid ${pendentesMes.length > 0 ? "#f97316" : "#1e2130"}40`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pendentesMes.length > 0 ? "#fed7aa" : "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Pendentes este mês</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: pendentesMes.length > 0 ? "#f97316" : "#4b5563", fontFamily: "'Space Mono',monospace" }}>{pendentesMes.length}</div>
                </div>
              </div>

              {todas.length === 0 ? (
                <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
                  <div style={{ color: "#4b5563", fontSize: 15 }}>Nenhuma assinatura ainda.</div>
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 6 }}>Registre um atendimento com "Recorrência automática" marcada.</div>
                </div>
              ) : (
                <div>
                  {ativas.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Ativas ({ativas.length})</div>
                      {ativas.map((a: any) => <AssinaturaRow key={a.id} a={a} />)}
                    </div>
                  )}
                  {canceladas.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Canceladas ({canceladas.length})</div>
                      {canceladas.map((a: any) => <AssinaturaRow key={a.id} a={a} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── FEEDBACKS ── */}
        {tab === "feedbacks" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>⭐ Feedbacks dos Clientes</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{metrics.feedbackCount} recebido(s) · Média: {metrics.avgFeedback ? `${metrics.avgFeedback}/4` : "—"}</div>
            </div>
            <div style={{ background: "#6366f110", border: "1px solid #6366f130", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>💡</div>
              <div>
                <div style={{ fontWeight: 700, color: "#818cf8", marginBottom: 4 }}>Como registrar feedback?</div>
                <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
                  1. Vá na aba <strong style={{ color: "#e8eaf0" }}>📋 Lista</strong><br />
                  2. Clique em <strong style={{ color: "#e8eaf0" }}>⭐ Feedback</strong> no atendimento desejado<br />
                  3. Preencha a nota e o comentário do cliente<br />
                  4. A avaliação aparece aqui no dashboard automaticamente ✨
                </div>
              </div>
            </div>
            {atendimentos.filter(a => a.feedbackNota).length === 0 ? (
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
                <div style={{ color: "#4b5563", fontSize: 15 }}>Nenhum feedback recebido ainda.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {atendimentos.filter(a => a.feedbackNota).sort((x, y) => new Date(y.feedbackEm).getTime() - new Date(x.feedbackEm).getTime()).map((a: any) => (
                  <div key={a.id} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 13, padding: "18px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 36, lineHeight: 1 }}>{a.feedbackNota.split(" ")[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#818cf8" }} onClick={() => abrirHistorico(a)}>
                        {a.empresa ? `${a.empresa} · ${a.nomeCliente}` : (a.nomeCliente || a.cliente)} ↗️
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}><strong style={{ color: "#e8eaf0" }}>{a.feedbackNota}</strong> · {CANAL_ICONS[a.canal]} {a.canal} · {formatDate(a.feedbackEm)}</div>
                      {a.feedbackComentario && <div style={{ marginTop: 10, background: "#1a1d2e", borderRadius: 9, padding: "10px 14px", fontSize: 14, color: "#d1d5db", fontStyle: "italic", borderLeft: "3px solid #6366f1" }}>"{a.feedbackComentario}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #374151; }
        input:focus, textarea:focus, select:focus { border-color: #6366f1 !important; }
        button:active { transform: scale(0.97); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        select option { background: #1a1d2e; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0b0d14; }
        ::-webkit-scrollbar-thumb { background: #2d3148; border-radius: 99px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </div>
  );
}
