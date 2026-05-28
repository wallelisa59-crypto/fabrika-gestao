import { supabase } from "./supabase";

// ── camelCase ↔ snake_case mapping ──────────────────────────

function toRow(a: any) {
  return {
    id: Number(a.id),
    criado_em: a.criadoEm || new Date().toISOString(),
    nome_cliente: a.nomeCliente || "",
    empresa: a.empresa || null,
    canal: a.canal || null,
    responsavel: a.responsavel || null,
    descricao: a.descricao || null,
    status: a.status || "Em negociação",
    tempo_resposta: a.tempoResposta || null,
    tempo_conclusao: a.tempoConclusao || null,
    observacao: a.observacao || null,
    valor_contrato: a.valorContrato ? Number(a.valorContrato) : null,
    tipo_contrato: a.tipoContrato || null,
    prazo_entrega: a.prazoEntrega || null,
    tipo_pessoa: a.tipoPessoa || "fisica",
    cpf: a.cpf || null,
    cnpj: a.cnpj || null,
    modelo_cobranca: a.modeloCobranca || null,
    forma_pagamento: a.formaPagamento || null,
    bandeira: a.bandeira || null,
    parcelas: a.parcelas || null,
    valor_entrada: a.valorEntrada ? Number(a.valorEntrada) : null,
    recorrencia_automatica: a.recorrenciaAutomatica || false,
    pagamento_antecipado: a.pagamentoAntecipado || false,
    feedback_nota: a.feedbackNota || null,
    feedback_comentario: a.feedbackComentario || null,
    feedback_em: a.feedbackEm || null,
    assinatura_cancelada: a.assinaturaCancelada || false,
  };
}

const VALID_STATUS = ["Em negociação", "Em desenvolvimento", "Perdido", "Concluído"];
const STATUS_LEGACY: Record<string, string> = {
  "COM COMPLETA": "Concluído",
  "Concluido": "Concluído",
  "concluido": "Concluído",
  "Completo": "Concluído",
  "completo": "Concluído",
};

function normalizeStatus(s: string | null | undefined): string {
  if (!s) return "Em negociação";
  if (VALID_STATUS.includes(s)) return s;
  return STATUS_LEGACY[s] ?? "Em negociação";
}

function fromRow(r: any) {
  return {
    id: r.id,
    criadoEm: r.criado_em,
    nomeCliente: r.nome_cliente || "",
    empresa: r.empresa || "",
    canal: r.canal || "",
    responsavel: r.responsavel || "",
    descricao: r.descricao || "",
    status: normalizeStatus(r.status),
    tempoResposta: r.tempo_resposta,
    tempoConclusao: r.tempo_conclusao,
    observacao: r.observacao || "",
    valorContrato: r.valor_contrato,
    tipoContrato: r.tipo_contrato || "",
    prazoEntrega: r.prazo_entrega || "",
    tipoPessoa: r.tipo_pessoa || "fisica",
    cpf: r.cpf || "",
    cnpj: r.cnpj || "",
    modeloCobranca: r.modelo_cobranca || "",
    formaPagamento: r.forma_pagamento || "",
    bandeira: r.bandeira || "",
    parcelas: r.parcelas || "",
    valorEntrada: r.valor_entrada,
    recorrenciaAutomatica: r.recorrencia_automatica || false,
    pagamentoAntecipado: r.pagamento_antecipado || false,
    feedbackNota: r.feedback_nota || null,
    feedbackComentario: r.feedback_comentario || null,
    feedbackEm: r.feedback_em || null,
    assinaturaCancelada: r.assinatura_cancelada || false,
  };
}

// ── Atendimentos ─────────────────────────────────────────────

export async function getAtendimentos() {
  const { data, error } = await supabase
    .from("atendimentos")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertAtendimento(a: any) {
  const { error } = await supabase
    .from("atendimentos")
    .upsert(toRow(a), { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAtendimento(id: number) {
  const { error } = await supabase
    .from("atendimentos")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Pagamentos recorrentes ────────────────────────────────────

export async function getPagamentosRec() {
  const { data, error } = await supabase
    .from("pagamentos_recorrentes")
    .select("*");
  if (error) throw error;
  return (data || []).map((p: any) => ({
    id: p.id,
    atendimentoId: p.atendimento_id,
    mes: p.mes,
    valor: p.valor,
    dataRecebido: p.data_recebido,
  }));
}

export async function insertPagamentoRec(p: any) {
  const { error } = await supabase
    .from("pagamentos_recorrentes")
    .insert({
      id: Number(p.id),
      atendimento_id: Number(p.atendimentoId),
      mes: p.mes,
      valor: Number(p.valor || 0),
      data_recebido: p.dataRecebido,
    });
  if (error) throw error;
}

export async function deletePagamentoRec(atendimentoId: number, mes: string) {
  const { error } = await supabase
    .from("pagamentos_recorrentes")
    .delete()
    .eq("atendimento_id", atendimentoId)
    .eq("mes", mes);
  if (error) throw error;
}
