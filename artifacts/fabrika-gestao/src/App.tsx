import { useState, useEffect, useCallback, useRef } from "react";

const CANAIS = ["WhatsApp", "Instagram", "E-mail", "Telefone", "Presencial", "Outro"];
const STATUS = ["Em negociação", "Em desenvolvimento", "Perdido", "Concluído"];
const NOTAS = ["😠 Ruim", "😐 Regular", "😊 Bom", "🤩 Ótimo"];
const TIPOS_CONTRATO = ["Mensalidade", "Projeto pontual", "Avulso", "Pacote"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];
const FASES = ["Briefing", "Proposta", "Em andamento", "Revisão", "Aprovação", "Entregue"];

const TIPOS_SERVICO: Record<string, string[]> = {
  "📱 Social Media": ["Gestão de Redes Sociais", "Feed Instagram", "Stories", "Reels/TikTok", "Calendário Editorial", "Copywriting"],
  "🎨 Design": ["Identidade Visual", "Logotipo", "Post/Arte", "Material Impresso", "Apresentação", "Banner/Outdoor"],
  "📈 Tráfego Pago": ["Meta Ads (Facebook/Instagram)", "Google Ads", "TikTok Ads", "Relatório de Mídia"],
  "🌐 Web & Tech": ["Website", "Landing Page", "E-commerce", "SEO"],
  "🎬 Conteúdo": ["Fotografia", "Vídeo/Motion", "Edição de Vídeo", "Podcast"],
  "🏷️ Branding": ["Branding Completo", "Rebranding", "Naming", "Manual de Marca"],
};

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
const FASE_COLORS: Record<string, string> = {
  "Briefing": "#8b5cf6", "Proposta": "#f59e0b", "Em andamento": "#3b82f6",
  "Revisão": "#f97316", "Aprovação": "#06b6d4", "Entregue": "#10b981",
};
const PRIO_COLORS: Record<string, string> = { "Alta": "#ef4444", "Média": "#f59e0b", "Baixa": "#10b981" };
const PRIO_ICONS: Record<string, string> = { "Alta": "🔴", "Média": "🟡", "Baixa": "🟢" };

function formatCPF(val: string) {
  const n = val.replace(/\D/g, "").slice(0, 11);
  return n.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function formatCNPJ(val: string) {
  const n = val.replace(/\D/g, "").slice(0, 14);
  return n.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
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
    if (!map[key]) map[key] = { nomeCliente: a.nomeCliente || a.cliente || "", empresa: a.empresa || "", atendimentos: [] };
    map[key].atendimentos.push(a);
  });
  return Object.values(map).sort((a: any, b: any) => (a.empresa || a.nomeCliente).localeCompare(b.empresa || b.nomeCliente));
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
  const receitaTotal = comContrato.reduce((s: number, a: any) => s + Number(a.valorContrato), 0);
  const vencendoHoje = atendimentos.filter(a => { const d = diasRestantes(a.prazoEntrega); return d !== null && d >= 0 && d <= 3 && a.status !== "Concluído"; });
  const atrasados = atendimentos.filter(a => { const d = diasRestantes(a.prazoEntrega); return d !== null && d < 0 && a.status !== "Concluído"; });
  const porCanal: any = {}; CANAIS.forEach(c => { porCanal[c] = atendimentos.filter(a => a.canal === c).length; });
  const porStatus: any = {}; STATUS.forEach(s => { porStatus[s] = atendimentos.filter(a => a.status === s).length; });
  const porFase: any = {}; FASES.forEach(f => { porFase[f] = atendimentos.filter(a => a.fase === f).length; });
  const porServico: any = {};
  Object.values(TIPOS_SERVICO).flat().forEach(s => { porServico[s] = atendimentos.filter(a => a.tipoServico === s).length; });
  const altaPrioridade = atendimentos.filter(a => a.prioridade === "Alta" && a.status !== "Concluído");
  const revisoesPendentes = atendimentos.filter(a => a.fase === "Revisão");
  return {
    total, perdidos: perdidos.length, concluidos: concluidos.length,
    avgResposta, avgConclusao, avgFeedback, feedbackCount: comFeedback.length,
    receitaTotal, vencendoHoje, atrasados,
    taxaPerdido: total > 0 ? ((perdidos.length / total) * 100).toFixed(0) : 0,
    taxaConclusao: total > 0 ? ((concluidos.length / total) * 100).toFixed(0) : 0,
    porCanal, porStatus, porFase, porServico, altaPrioridade, revisoesPendentes,
  };
}

const EMPTY_FORM = {
  nomeCliente: "", empresa: "", canal: "", responsavel: "", descricao: "",
  status: "Em negociação", fase: "Briefing", prioridade: "Média",
  tipoServico: "", tipoConteudo: "",
  tempoRespostaHoras: "", tempoRespostaMinutos: "",
  tempoConclusaoHoras: "", tempoConclusaoMinutos: "",
  observacao: "", valorContrato: "", tipoContrato: "", prazoEntrega: "",
  tipoPessoa: "fisica" as "fisica" | "juridica", cpf: "", cnpj: "",
  redesSociais: "", linkDrive: "", linkReferencia: "", linkEntregavel: "",
  revisoes: "0", recorrente: false as boolean,
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
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 16 }}>{a.feedbackNota && !enviado ? "Feedback já registrado!" : "Obrigado pelo feedback!"}</div>
        <div style={{ color: "#6b7280", marginTop: 8 }}>{a.feedbackNota && !enviado ? `Avaliação: ${a.feedbackNota}` : "Sua opinião foi registrada com sucesso."}</div>
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
          {a.tipoServico && <div style={{ fontSize: 12, color: "#818cf8", marginTop: 2 }}>🎯 {a.tipoServico}</div>}
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
          <textarea value={comentario} onChange={e => setComentario(e.target.value)} placeholder="O que o cliente disse..." rows={3}
            style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 10, color: "#e8eaf0", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <button onClick={() => { if (!nota) return; onSave(a.id, nota, comentario); setEnviado(true); }} disabled={!nota}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: nota ? "pointer" : "not-allowed", background: nota ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#1a1d2e", color: nota ? "#fff" : "#4b5563", fontWeight: 700, fontSize: 15 }}>
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
  const redesSociais = hist.find((a: any) => a.redesSociais)?.redesSociais;
  const recorrente = hist.some((a: any) => a.recorrente);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "88vh", overflow: "auto", padding: 32 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>👤 {titulo}</div>
              {recorrente && <span style={{ background: "#6366f120", color: "#818cf8", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>🔄 Recorrente</span>}
            </div>
            {redesSociais && <div style={{ fontSize: 13, color: "#818cf8", marginTop: 4 }}>📱 {redesSociais}</div>}
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
                    {a.fase && <span style={{ background: FASE_COLORS[a.fase] + "22", color: FASE_COLORS[a.fase], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{a.fase}</span>}
                    {a.prioridade && a.prioridade !== "Média" && <span style={{ fontSize: 12 }}>{PRIO_ICONS[a.prioridade]}</span>}
                    {a.feedbackNota && <span style={{ fontSize: 14 }}>{a.feedbackNota.split(" ")[0]}</span>}
                  </div>
                  <button onClick={() => { onEdit(a); onClose(); }} style={{ background: "transparent", border: "1px solid #2d3148", borderRadius: 7, color: "#818cf8", cursor: "pointer", padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>✏️ Editar</button>
                </div>
                {a.tipoServico && <div style={{ fontSize: 12, color: "#818cf8", marginTop: 4 }}>🎯 {a.tipoServico}</div>}
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{CANAL_ICONS[a.canal]} {a.canal} · 👤 {a.responsavel}</div>
                {a.descricao && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6, lineHeight: 1.5 }}>{a.descricao}</div>}
                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                  {a.valorContrato && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>💰 {formatBRL(a.valorContrato)}{a.tipoContrato ? ` · ${a.tipoContrato}` : ""}</span>}
                  {a.prazoEntrega && <span style={{ fontSize: 12, color: prazoColor ?? "#9ca3af", fontWeight: 600 }}>📅 {formatDate(a.prazoEntrega)}</span>}
                  {a.tempoResposta && <span style={{ fontSize: 12, color: "#f59e0b" }}>⚡ {formatDuration(a.tempoResposta)}</span>}
                  {a.revisoes && Number(a.revisoes) > 0 && <span style={{ fontSize: 12, color: "#f97316" }}>🔄 {a.revisoes} revisão(ões)</span>}
                </div>
                {(a.linkDrive || a.linkEntregavel) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {a.linkDrive && <a href={a.linkDrive} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", background: "#6366f115", borderRadius: 6, padding: "2px 8px" }}>📁 Drive</a>}
                    {a.linkEntregavel && <a href={a.linkEntregavel} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#10b981", textDecoration: "none", background: "#10b98115", borderRadius: 6, padding: "2px 8px" }}>🚀 Entregável</a>}
                    {a.linkReferencia && <a href={a.linkReferencia} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#f59e0b", textDecoration: "none", background: "#f59e0b15", borderRadius: 6, padding: "2px 8px" }}>🎨 Referência</a>}
                  </div>
                )}
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
      <input value={value} onChange={e => { onChange(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)} placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      {aberto && sugestoes.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {sugestoes.map((c: any, i: number) => (
            <div key={i} onMouseDown={() => { onSelect({ nomeCliente: c.nomeCliente || "", empresa: c.empresa || "" }); setAberto(false); }}
              style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #2d3148" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#2d3148")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>{c.nomeCliente}</div>
              {c.empresa && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>🏢 {c.empresa} · {c.atendimentos.length} atendimento(s)</div>}
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
  const [filtroFase, setFiltroFase] = useState("Todas");
  const [filtroPrioridade, setFiltroPrioridade] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackAtendimento, setFeedbackAtendimento] = useState<any>(null);
  const [clienteHistoricoKey, setClienteHistoricoKey] = useState<string | null>(null);
  const [servicoAberto, setServicoAberto] = useState<string | null>(null);

  const showToast = (msg: string, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      try {
        const r = await (window as any).storage.get("atendimentos_v4");
        if (r && r.value) setAtendimentos(JSON.parse(r.value));
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const saveStorage = useCallback(async (data: any[]) => {
    try { await (window as any).storage.set("atendimentos_v4", JSON.stringify(data)); } catch (_) {}
  }, []);

  const handleFeedbackSave = async (id: number, nota: string, comentario: string) => {
    const updated = atendimentos.map(a => a.id === id ? { ...a, feedbackNota: nota, feedbackComentario: comentario, feedbackEm: new Date().toISOString() } : a);
    setAtendimentos(updated); await saveStorage(updated);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0d14", color: "#fff", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div><div style={{ opacity: 0.5, fontSize: 14 }}>Carregando...</div></div>
    </div>
  );

  const handleSubmit = async () => {
    if (!form.nomeCliente || !form.canal || !form.responsavel) { showToast("Preencha Nome do Cliente, Canal e Responsável!", "err"); return; }
    setSalvando(true);
    const totalRespostaMin = (Number(form.tempoRespostaHoras) || 0) * 60 + (Number(form.tempoRespostaMinutos) || 0);
    const totalConclusaoMin = (Number(form.tempoConclusaoHoras) || 0) * 60 + (Number(form.tempoConclusaoMinutos) || 0);
    const parsed = {
      nomeCliente: form.nomeCliente, empresa: form.empresa, canal: form.canal,
      responsavel: form.responsavel, descricao: form.descricao, status: form.status,
      fase: form.fase, prioridade: form.prioridade,
      tipoServico: form.tipoServico, tipoConteudo: form.tipoConteudo,
      tempoResposta: totalRespostaMin > 0 ? totalRespostaMin : null,
      tempoConclusao: totalConclusaoMin > 0 ? totalConclusaoMin : null,
      observacao: form.observacao,
      valorContrato: form.valorContrato ? Number(String(form.valorContrato).replace(",", ".")) : null,
      tipoContrato: form.tipoContrato, prazoEntrega: form.prazoEntrega,
      tipoPessoa: form.tipoPessoa, cpf: form.cpf, cnpj: form.cnpj,
      redesSociais: form.redesSociais,
      linkDrive: form.linkDrive, linkReferencia: form.linkReferencia, linkEntregavel: form.linkEntregavel,
      revisoes: form.revisoes, recorrente: form.recorrente,
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
      cpf: a.cpf || "", cnpj: a.cnpj || "",
      redesSociais: a.redesSociais || "",
      linkDrive: a.linkDrive || "", linkReferencia: a.linkReferencia || "", linkEntregavel: a.linkEntregavel || "",
      revisoes: a.revisoes || "0", recorrente: a.recorrente || false,
      fase: a.fase || "Briefing", prioridade: a.prioridade || "Média",
      tipoServico: a.tipoServico || "", tipoConteudo: a.tipoConteudo || "",
    });
    setEditId(a.id); setTab("novo");
  };
  const handleDelete = async (id: number) => {
    const updated = atendimentos.filter(a => a.id !== id);
    setAtendimentos(updated); await saveStorage(updated); showToast("Removido.", "err");
  };

  const clientes = getClientes(atendimentos);
  const filtrados = atendimentos.filter(a => {
    const buscaOk = busca === "" || (a.nomeCliente || a.cliente || "").toLowerCase().includes(busca.toLowerCase()) || (a.empresa || "").toLowerCase().includes(busca.toLowerCase()) || (a.responsavel || "").toLowerCase().includes(busca.toLowerCase()) || (a.tipoServico || "").toLowerCase().includes(busca.toLowerCase());
    return (filtroCanal === "Todos" || a.canal === filtroCanal) &&
      (filtroStatus === "Todos" || a.status === filtroStatus) &&
      (filtroFase === "Todas" || a.fase === filtroFase) &&
      (filtroPrioridade === "Todas" || a.prioridade === filtroPrioridade) &&
      buscaOk;
  });

  const metrics = calcMetrics(atendimentos);
  const feedbackRecentes = atendimentos.filter(a => a.feedbackNota).sort((x, y) => new Date(y.feedbackEm).getTime() - new Date(x.feedbackEm).getTime()).slice(0, 5);
  const alertasPrazo = [...metrics.atrasados, ...metrics.vencendoHoje].filter((a, i, arr) => arr.findIndex((b: any) => b.id === a.id) === i);
  const respostaClassif = classifyResposta(metrics.avgResposta);

  const abrirHistorico = (a: any) => setClienteHistoricoKey(chaveCliente(a));

  // Serviços mais usados
  const topServicos = Object.entries(metrics.porServico)
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d14", fontFamily: "'DM Sans',sans-serif", color: "#e8eaf0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {feedbackAtendimento && <FeedbackModal atendimento={feedbackAtendimento} onSave={handleFeedbackSave} onClose={() => setFeedbackAtendimento(null)} />}

      {clienteHistoricoKey && (
        <ClienteHistorico clienteKey={clienteHistoricoKey} clientes={clientes} atendimentos={atendimentos}
          onClose={() => setClienteHistoricoKey(null)} onEdit={(a: any) => { handleEdit(a); setTab("novo"); }} />
      )}

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "err" ? "#ef4444" : "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }}>
          {toast.type === "err" ? "⚠️" : "✅"} {toast.msg}
        </div>
      )}

      {/* Alertas */}
      {(alertasPrazo.length > 0 || metrics.altaPrioridade.length > 0 || metrics.revisoesPendentes.length > 0) && tab === "dashboard" && (
        <div style={{ background: "#ef444415", borderBottom: "1px solid #ef444430", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontWeight: 700, color: "#ef4444", fontSize: 13 }}>
            {metrics.atrasados.length > 0 && `${metrics.atrasados.length} prazo(s) vencido(s)`}
            {metrics.atrasados.length > 0 && metrics.vencendoHoje.length > 0 && " · "}
            {metrics.vencendoHoje.length > 0 && `${metrics.vencendoHoje.length} vencendo em 3 dias`}
            {alertasPrazo.length > 0 && metrics.altaPrioridade.length > 0 && " · "}
            {metrics.altaPrioridade.length > 0 && `${metrics.altaPrioridade.length} alta prioridade em aberto`}
            {metrics.revisoesPendentes.length > 0 && ` · ${metrics.revisoesPendentes.length} em revisão`}
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
            { id: "pipeline", label: "🚀 Pipeline" },
            { id: "novo", label: editId ? "✏️ Editar" : "➕ Novo" },
            { id: "lista", label: "📋 Lista" },
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
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Visão Geral</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{atendimentos.length} atendimento(s) · {clientes.length} cliente(s)</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total de Atendimentos", value: metrics.total, icon: "📥", color: "#6366f1" },
                { label: "Receita Total", value: metrics.receitaTotal > 0 ? formatBRL(metrics.receitaTotal) : "—", icon: "💰", color: "#10b981" },
                { label: "Tempo Médio de Resposta", value: metrics.avgResposta ? formatDuration(metrics.avgResposta) : "—", icon: "⚡", color: respostaClassif?.color ?? "#f59e0b", sub: respostaClassif?.label ?? null },
                { label: "Alta Prioridade em Aberto", value: metrics.altaPrioridade.length, icon: "🔴", color: "#ef4444" },
                { label: "Em Revisão Agora", value: metrics.revisoesPendentes.length, icon: "🔄", color: "#f97316" },
                { label: "Taxa de Conclusão", value: `${metrics.taxaConclusao}%`, icon: "✅", color: "#10b981" },
              ].map((k: any) => (
                <div key={k.label} style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -8, right: -8, fontSize: 52, opacity: 0.05 }}>{k.icon}</div>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "'Space Mono',monospace", lineHeight: 1 }}>{k.value}</div>
                  {k.sub && <div style={{ marginTop: 4, display: "inline-block", background: k.color + "22", color: k.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{k.sub}</div>}
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6, lineHeight: 1.4 }}>{k.label}</div>
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
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{a.tipoServico || a.responsavel} · Prazo: {formatDate(a.prazoEntrega)}</div>
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
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🎯 Serviços Mais Solicitados</div>
                {topServicos.length === 0
                  ? <div style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Nenhum dado ainda.</div>
                  : topServicos.map(([servico, count]) => {
                    const pct = metrics.total > 0 ? ((count as number) / metrics.total) * 100 : 0;
                    return (
                      <div key={servico} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                          <span style={{ color: "#9ca3af" }}>{servico}</span>
                          <span style={{ fontFamily: "'Space Mono',monospace", color: "#6366f1", fontWeight: 700 }}>{count as number}</span>
                        </div>
                        <div style={{ height: 5, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99 }} /></div>
                      </div>
                    );
                  })}
              </div>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🚀 Por Fase</div>
                {FASES.map(f => { const count = metrics.porFase[f]; const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0; return (
                  <div key={f} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                      <span style={{ color: FASE_COLORS[f] }}>{f}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", color: "#9ca3af" }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: FASE_COLORS[f], borderRadius: 99, opacity: 0.85 }} /></div>
                  </div>
                ); })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>📡 Por Canal</div>
                {CANAIS.map(c => { const count = metrics.porCanal[c]; const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0; return (
                  <div key={c} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}><span>{CANAL_ICONS[c]} {c}</span><span style={{ fontFamily: "'Space Mono',monospace", color: "#9ca3af" }}>{count}</span></div>
                    <div style={{ height: 5, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99 }} /></div>
                  </div>
                ); })}
              </div>
              <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🔖 Por Status</div>
                {STATUS.map(s => { const count = metrics.porStatus[s]; const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0; return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS[s], display: "inline-block" }} />{STATUS_ICONS[s]} {s}</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", color: "#9ca3af" }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: "#1e2130", borderRadius: 99 }}><div style={{ height: "100%", width: `${pct}%`, background: STATUS_COLORS[s], borderRadius: 99, opacity: 0.9 }} /></div>
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
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.empresa ? `${a.empresa} · ` : ""}{a.nomeCliente || a.cliente} <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 13 }}>· {a.feedbackNota.split(" ").slice(1).join(" ")}</span></div>
                      {a.feedbackComentario && <div style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>"{a.feedbackComentario}"</div>}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563" }}>{formatDate(a.feedbackEm)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: "#fff", fontSize: 15 }}>🕐 Últimos Registros</div>
              {atendimentos.slice(0, 5).length === 0
                ? <div style={{ color: "#4b5563", textAlign: "center", padding: "20px 0", fontSize: 14 }}>Nenhum atendimento ainda.</div>
                : atendimentos.slice(0, 5).map((a: any) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #1a1d2e" }}>
                    <div style={{ fontSize: 22 }}>{CANAL_ICONS[a.canal]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#818cf8" }} onClick={() => abrirHistorico(a)}>
                        {a.empresa ? <><span style={{ color: "#fff" }}>{a.empresa}</span> · {a.nomeCliente}</> : a.nomeCliente || a.cliente} ↗️
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{a.tipoServico || a.canal} · 👤 {a.responsavel} · {formatDateTime(a.criadoEm)}</div>
                    </div>
                    {a.prioridade === "Alta" && <span style={{ fontSize: 14 }}>🔴</span>}
                    {a.fase && <span style={{ background: FASE_COLORS[a.fase] + "22", color: FASE_COLORS[a.fase], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{a.fase}</span>}
                    <div style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600 }}>{STATUS_ICONS[a.status]} {a.status}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── PIPELINE ── */}
        {tab === "pipeline" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>🚀 Pipeline de Projetos</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>Visualize todos os projetos por fase</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {FASES.map(fase => {
                const projetos = atendimentos.filter(a => a.fase === fase && a.status !== "Concluído");
                return (
                  <div key={fase} style={{ background: "#0f1117", border: `1px solid ${FASE_COLORS[fase]}33`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", background: FASE_COLORS[fase] + "15", borderBottom: `1px solid ${FASE_COLORS[fase]}33`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, color: FASE_COLORS[fase], fontSize: 14 }}>{fase}</span>
                      <span style={{ background: FASE_COLORS[fase] + "33", color: FASE_COLORS[fase], borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{projetos.length}</span>
                    </div>
                    <div style={{ padding: 10, minHeight: 100, display: "flex", flexDirection: "column", gap: 8 }}>
                      {projetos.length === 0
                        ? <div style={{ color: "#4b5563", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Nenhum projeto</div>
                        : projetos.map((a: any) => {
                          const dias = diasRestantes(a.prazoEntrega);
                          return (
                            <div key={a.id} style={{ background: "#1a1d2e", borderRadius: 10, padding: "12px 14px", cursor: "pointer", borderLeft: `3px solid ${a.prioridade === "Alta" ? "#ef4444" : a.prioridade === "Baixa" ? "#10b981" : "#f59e0b"}` }}
                              onClick={() => handleEdit(a)}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{a.empresa || a.nomeCliente}</div>
                              {a.tipoServico && <div style={{ fontSize: 11, color: "#818cf8", marginTop: 2 }}>🎯 {a.tipoServico}</div>}
                              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>👤 {a.responsavel}</div>
                              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                                {a.valorContrato && <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>{formatBRL(a.valorContrato)}</span>}
                                {a.prazoEntrega && dias !== null && <span style={{ fontSize: 11, color: dias < 0 ? "#ef4444" : dias <= 3 ? "#f59e0b" : "#6b7280" }}>📅 {dias < 0 ? `${Math.abs(dias)}d atrasado` : `${dias}d`}</span>}
                                {a.revisoes && Number(a.revisoes) > 0 && <span style={{ fontSize: 11, color: "#f97316" }}>🔄 {a.revisoes}x</span>}
                                <span style={{ fontSize: 14 }}>{PRIO_ICONS[a.prioridade] || "🟡"}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NOVO / EDITAR ── */}
        {tab === "novo" && (
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{editId ? "✏️ Editar Atendimento" : "➕ Novo Atendimento"}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>Preencha os dados do atendimento</div>
            </div>
            <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: 16, padding: 28 }}>

              {/* Identificação */}
              <div style={{ background: "#6366f108", border: "1px solid #6366f120", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: "#818cf8", fontSize: 14, marginBottom: 14 }}>👤 Identificação</div>
                <div style={{ marginBottom: 14 }}>
                  <Label>Tipo de Pessoa</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["fisica", "juridica"] as const).map(tipo => (
                      <button key={tipo} onClick={() => setForm(p => ({ ...p, tipoPessoa: tipo, cpf: "", cnpj: "" }))}
                        style={{ flex: 1, padding: "10px 14px", borderRadius: 9, border: `1px solid ${form.tipoPessoa === tipo ? "#6366f1" : "#2d3148"}`, background: form.tipoPessoa === tipo ? "#6366f120" : "#1a1d2e", color: form.tipoPessoa === tipo ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
                        {tipo === "fisica" ? "👤 Pessoa Física" : "🏢 Pessoa Jurídica"}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <Label>Nome do Cliente *</Label>
                    <AutocompleteCliente value={form.nomeCliente} onChange={(val: string) => setForm(p => ({ ...p, nomeCliente: val }))} onSelect={({ nomeCliente, empresa }: any) => setForm(p => ({ ...p, nomeCliente, empresa }))} clientes={clientes} placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Field value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} placeholder="Ex: Nil Modas" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    {form.tipoPessoa === "fisica" ? (
                      <>
                        <Label>CPF</Label>
                        <Field value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" />
                      </>
                    ) : (
                      <>
                        <Label>CNPJ</Label>
                        <Field value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: formatCNPJ(e.target.value) }))} placeholder="00.000.000/0000-00" />
                      </>
                    )}
                  </div>
                  <div>
                    <Label>📱 Redes Sociais</Label>
                    <Field value={form.redesSociais} onChange={e => setForm(p => ({ ...p, redesSociais: e.target.value }))} placeholder="@usuario / @empresa" />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="recorrente" checked={form.recorrente} onChange={e => setForm(p => ({ ...p, recorrente: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <label htmlFor="recorrente" style={{ fontSize: 13, color: "#9ca3af", cursor: "pointer", userSelect: "none" }}>
                    🔄 <strong style={{ color: "#818cf8" }}>Cliente recorrente</strong> (contrato mensal / plano fixo)
                  </label>
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
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${form.canal === c ? "#6366f1" : "#2d3148"}`, background: form.canal === c ? "#6366f120" : "#1a1d2e", color: form.canal === c ? "#818cf8" : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {CANAL_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Serviço */}
              <div style={{ background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#a78bfa", fontSize: 14, marginBottom: 14 }}>🎯 Tipo de Serviço</div>
                {Object.entries(TIPOS_SERVICO).map(([categoria, servicos]) => (
                  <div key={categoria} style={{ marginBottom: 12 }}>
                    <button onClick={() => setServicoAberto(servicoAberto === categoria ? null : categoria)}
                      style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      {categoria} <span style={{ opacity: 0.5 }}>{servicoAberto === categoria ? "▲" : "▼"}</span>
                    </button>
                    {servicoAberto === categoria && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {servicos.map(s => (
                          <button key={s} onClick={() => setForm(p => ({ ...p, tipoServico: s }))}
                            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${form.tipoServico === s ? "#8b5cf6" : "#2d3148"}`, background: form.tipoServico === s ? "#8b5cf620" : "#1a1d2e", color: form.tipoServico === s ? "#a78bfa" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {form.tipoServico && (
                  <div style={{ marginTop: 8, padding: "6px 12px", background: "#8b5cf620", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#a78bfa" }}>
                    🎯 {form.tipoServico}
                    <button onClick={() => setForm(p => ({ ...p, tipoServico: "" }))} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                  </div>
                )}
              </div>

              {/* Fase + Prioridade */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                <div>
                  <Label>Fase do Projeto</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {FASES.map(f => (
                      <button key={f} onClick={() => setForm(p => ({ ...p, fase: f }))}
                        style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${form.fase === f ? FASE_COLORS[f] : "#2d3148"}`, background: form.fase === f ? FASE_COLORS[f] + "22" : "#1a1d2e", color: form.fase === f ? FASE_COLORS[f] : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {PRIORIDADES.map(p => (
                      <button key={p} onClick={() => setForm(f => ({ ...f, prioridade: p }))}
                        style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${form.prioridade === p ? PRIO_COLORS[p] : "#2d3148"}`, background: form.prioridade === p ? PRIO_COLORS[p] + "22" : "#1a1d2e", color: form.prioridade === p ? PRIO_COLORS[p] : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                        {PRIO_ICONS[p]} {p}
                      </button>
                    ))}
                  </div>
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
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${form.status === s ? STATUS_COLORS[s] : "#2d3148"}`, background: form.status === s ? STATUS_COLORS[s] + "22" : "#1a1d2e", color: form.status === s ? STATUS_COLORS[s] : "#9ca3af", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {STATUS_ICONS[s]} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor e revisões */}
              <div style={{ background: "#10b98108", border: "1px solid #10b98120", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#10b981", fontSize: 14, marginBottom: 14 }}>💰 Contrato</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Field type="number" min="0" value={form.valorContrato} onChange={e => setForm(p => ({ ...p, valorContrato: e.target.value }))} placeholder="1500" />
                  </div>
                  <div>
                    <Label>Tipo de Contrato</Label>
                    <select value={form.tipoContrato} onChange={e => setForm(p => ({ ...p, tipoContrato: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: form.tipoContrato ? "#e8eaf0" : "#374151", fontSize: 14, outline: "none", boxSizing: "border-box" }}>
                      <option value="">Selecione...</option>
                      {TIPOS_CONTRATO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>🔄 Nº de Revisões</Label>
                    <Field type="number" min="0" value={form.revisoes} onChange={e => setForm(p => ({ ...p, revisoes: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Prazo */}
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

              {/* Links */}
              <div style={{ background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#06b6d4", fontSize: 14, marginBottom: 14 }}>🔗 Links do Projeto</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <Label>📁 Link do Google Drive</Label>
                    <Field value={form.linkDrive} onChange={e => setForm(p => ({ ...p, linkDrive: e.target.value }))} placeholder="https://drive.google.com/..." />
                  </div>
                  <div>
                    <Label>🎨 Link de Referência</Label>
                    <Field value={form.linkReferencia} onChange={e => setForm(p => ({ ...p, linkReferencia: e.target.value }))} placeholder="Behance, Pinterest, site..." />
                  </div>
                  <div>
                    <Label>🚀 Link do Entregável</Label>
                    <Field value={form.linkEntregavel} onChange={e => setForm(p => ({ ...p, linkEntregavel: e.target.value }))} placeholder="Link final para o cliente" />
                  </div>
                </div>
              </div>

              {/* Tempos */}
              <div style={{ background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 12, padding: "16px 18px", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: 14, marginBottom: 14 }}>⏱️ Tempos de Atendimento</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>⚡ Tempo de Resposta</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Do primeiro contato até a resposta</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><Label>Horas</Label><Field type="number" min="0" value={form.tempoRespostaHoras} onChange={e => setForm(p => ({ ...p, tempoRespostaHoras: e.target.value }))} placeholder="0" /></div>
                      <div><Label>Minutos</Label><Field type="number" min="0" value={form.tempoRespostaMinutos} onChange={e => setForm(p => ({ ...p, tempoRespostaMinutos: String(Math.min(59, Number(e.target.value))) }))} placeholder="0" /></div>
                    </div>
                    {(form.tempoRespostaHoras || form.tempoRespostaMinutos) && (() => {
                      const total = (Number(form.tempoRespostaHoras) || 0) * 60 + (Number(form.tempoRespostaMinutos) || 0);
                      const cl = classifyResposta(total);
                      return cl ? <div style={{ marginTop: 6, display: "inline-block", background: cl.color + "22", color: cl.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{cl.label}</div> : null;
                    })()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>⏱️ Tempo de Conclusão</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Do início ao fim do projeto</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><Label>Horas</Label><Field type="number" min="0" value={form.tempoConclusaoHoras} onChange={e => setForm(p => ({ ...p, tempoConclusaoHoras: e.target.value }))} placeholder="0" /></div>
                      <div><Label>Minutos</Label><Field type="number" min="0" value={form.tempoConclusaoMinutos} onChange={e => setForm(p => ({ ...p, tempoConclusaoMinutos: String(Math.min(59, Number(e.target.value))) }))} placeholder="0" /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <Label>📝 Observações</Label>
                <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Próximos passos, anotações, briefing..." rows={2}
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
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>📋 Todos os Atendimentos</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{filtrados.length} resultado(s)</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#6b7280" }}>🔍</span>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por cliente, serviço..."
                  style={{ width: "100%", padding: "9px 14px 9px 38px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 9, color: "#e8eaf0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ padding: "8px 12px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#e8eaf0", fontSize: 13, cursor: "pointer" }}>
                <option value="Todos">Todos os Status</option>{STATUS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filtroFase} onChange={e => setFiltroFase(e.target.value)} style={{ padding: "8px 12px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#e8eaf0", fontSize: 13, cursor: "pointer" }}>
                <option value="Todas">Todas as Fases</option>{FASES.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} style={{ padding: "8px 12px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 8, color: "#e8eaf0", fontSize: 13, cursor: "pointer" }}>
                <option value="Todas">Todas as Prioridades</option>{PRIORIDADES.map(p => <option key={p}>{p}</option>)}
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
                    <div key={a.id} style={{ background: "#0f1117", border: `1px solid ${a.prioridade === "Alta" ? "#ef444430" : "#1e2130"}`, borderRadius: 13, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14, borderLeft: `3px solid ${FASE_COLORS[a.fase] || "#1e2130"}` }}>
                      <div style={{ fontSize: 24, lineHeight: 1.3 }}>{CANAL_ICONS[a.canal]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15, cursor: "pointer", color: "#818cf8" }} onClick={() => abrirHistorico(a)}>
                            {a.empresa ? <>{a.empresa} <span style={{ color: "#6b7280", fontWeight: 400 }}>· {a.nomeCliente}</span></> : (a.nomeCliente || a.cliente)} ↗️
                          </span>
                          {a.prioridade && <span style={{ fontSize: 13 }}>{PRIO_ICONS[a.prioridade]}</span>}
                          <span style={{ background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{STATUS_ICONS[a.status]} {a.status}</span>
                          {a.fase && <span style={{ background: FASE_COLORS[a.fase] + "22", color: FASE_COLORS[a.fase], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{a.fase}</span>}
                          {a.recorrente && <span style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>🔄</span>}
                          {a.feedbackNota && <span style={{ fontSize: 13 }} title={a.feedbackNota}>{a.feedbackNota.split(" ")[0]}</span>}
                        </div>
                        {a.tipoServico && <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 3 }}>🎯 {a.tipoServico}</div>}
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{a.canal} · 👤 {a.responsavel} · {formatDateTime(a.criadoEm)}</div>
                        {a.descricao && <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 5, lineHeight: 1.5 }}>{a.descricao}</div>}
                        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {a.valorContrato && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>💰 {formatBRL(a.valorContrato)}</span>}
                          {a.prazoEntrega && <span style={{ fontSize: 12, color: prazoColor ?? "#9ca3af", fontWeight: 600 }}>📅 {formatDate(a.prazoEntrega)}{dias !== null ? ` · ${dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `${dias}d`}` : ""}</span>}
                          {a.tempoResposta && <span style={{ fontSize: 12, color: "#f59e0b" }}>⚡ {formatDuration(a.tempoResposta)}</span>}
                          {Number(a.revisoes) > 0 && <span style={{ fontSize: 12, color: "#f97316" }}>🔄 {a.revisoes} revisão(ões)</span>}
                          {a.linkEntregavel && <a href={a.linkEntregavel} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#10b981", textDecoration: "none", background: "#10b98115", borderRadius: 6, padding: "1px 8px" }}>🚀 Entregável</a>}
                          {a.linkDrive && <a href={a.linkDrive} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", background: "#6366f115", borderRadius: 6, padding: "1px 8px" }}>📁 Drive</a>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => setFeedbackAtendimento(a)}
                          style={{ padding: "5px 10px", background: a.feedbackNota ? "#10b98122" : "#1a1d2e", border: `1px solid ${a.feedbackNota ? "#10b981" : "#2d3148"}`, borderRadius: 7, color: a.feedbackNota ? "#10b981" : "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          {a.feedbackNota ? "⭐ Ok" : "⭐"}
                        </button>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button onClick={() => handleEdit(a)} style={{ flex: 1, padding: "5px 8px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 7, color: "#818cf8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✏️</button>
                          <button onClick={() => handleDelete(a.id)} style={{ padding: "5px 8px", background: "#1a1d2e", border: "1px solid #2d3148", borderRadius: 7, color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗑️</button>
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
                  const receita = c.atendimentos.filter((a: any) => a.valorContrato).reduce((s: number, a: any) => s + Number(a.valorContrato), 0);
                  const ultimo = c.atendimentos.sort((a: any, b: any) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0];
                  const feedbacks = c.atendimentos.filter((a: any) => a.feedbackNota);
                  const notaMap: any = { "😠 Ruim": 1, "😐 Regular": 2, "😊 Bom": 3, "🤩 Ótimo": 4 };
                  const avgFeed = feedbacks.length ? (feedbacks.reduce((s: number, a: any) => s + notaMap[a.feedbackNota], 0) / feedbacks.length).toFixed(1) : null;
                  const prazoUrgente = c.atendimentos.find((a: any) => { const d = diasRestantes(a.prazoEntrega); return d !== null && d <= 3 && a.status !== "Concluído"; });
                  const recorrente = c.atendimentos.some((a: any) => a.recorrente);
                  const redesSociais = c.atendimentos.find((a: any) => a.redesSociais)?.redesSociais;
                  const servicosUsados = [...new Set(c.atendimentos.map((a: any) => a.tipoServico).filter(Boolean))].slice(0, 3);
                  const titulo = c.empresa || c.nomeCliente;
                  return (
                    <div key={titulo} style={{ background: "#0f1117", border: `1px solid ${prazoUrgente ? "#ef444430" : "#1e2130"}`, borderRadius: 14, padding: 20, cursor: "pointer" }}
                      onClick={() => setClienteHistoricoKey((c.empresa || c.nomeCliente).trim().toLowerCase())}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{titulo}</div>
                            {recorrente && <span style={{ background: "#6366f120", color: "#818cf8", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>🔄</span>}
                          </div>
                          {c.empresa && c.nomeCliente && <div style={{ fontSize: 12, color: "#6b7280" }}>👤 {c.nomeCliente}</div>}
                          {redesSociais && <div style={{ fontSize: 12, color: "#818cf8", marginTop: 1 }}>📱 {redesSociais}</div>}
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{c.atendimentos.length} atendimento(s) · {formatDate(ultimo?.criadoEm)}</div>
                        </div>
                      </div>
                      {servicosUsados.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                          {(servicosUsados as string[]).map((s: string) => (
                            <span key={s} style={{ background: "#8b5cf620", color: "#a78bfa", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>{s}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {receita > 0 && <div style={{ background: "#10b98115", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#10b981", fontWeight: 700 }}>💰 {formatBRL(receita)}</div>}
                        {avgFeed && <div style={{ background: "#f59e0b15", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>⭐ {avgFeed}/4</div>}
                        {prazoUrgente && <div style={{ background: "#ef444415", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#ef4444", fontWeight: 700 }}>🚨 Prazo urgente</div>}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>Ver histórico <span style={{ color: "#6366f1" }}>→</span></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                  2. Clique em <strong style={{ color: "#e8eaf0" }}>⭐</strong> no atendimento desejado<br />
                  3. Preencha a nota e o comentário do cliente ✨
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
                      {a.tipoServico && <div style={{ fontSize: 12, color: "#a78bfa", marginTop: 2 }}>🎯 {a.tipoServico}</div>}
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
