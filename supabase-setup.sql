-- ============================================================
-- Fabrika Gestão — Schema completo
-- Cole tudo no Supabase → SQL Editor → New query → Run
-- ============================================================

-- Remove tabela genérica anterior (se existir)
drop table if exists public.app_storage;

-- ============================================================
-- Tabela: atendimentos
-- ============================================================
create table if not exists public.atendimentos (
  id                    bigint primary key,
  criado_em             timestamptz not null default now(),
  nome_cliente          text not null default '',
  empresa               text,
  canal                 text,
  responsavel           text,
  descricao             text,
  status                text default 'Em negociação',
  tempo_resposta        integer,
  tempo_conclusao       integer,
  observacao            text,
  valor_contrato        numeric,
  tipo_contrato         text,
  prazo_entrega         date,
  tipo_pessoa           text default 'fisica',
  cpf                   text,
  cnpj                  text,
  modelo_cobranca       text,
  forma_pagamento       text,
  bandeira              text,
  parcelas              text,
  valor_entrada         numeric,
  recorrencia_automatica  boolean default false,
  pagamento_antecipado    boolean default false,
  feedback_nota         text,
  feedback_comentario   text,
  feedback_em           timestamptz,
  assinatura_cancelada  boolean default false
);

alter table public.atendimentos enable row level security;

drop policy if exists "Allow all for anon" on public.atendimentos;
create policy "Allow all for anon"
  on public.atendimentos for all
  using (true) with check (true);

-- ============================================================
-- Tabela: pagamentos_recorrentes
-- ============================================================
create table if not exists public.pagamentos_recorrentes (
  id               bigint primary key,
  atendimento_id   bigint references public.atendimentos(id) on delete cascade,
  mes              text not null,
  valor            numeric default 0,
  data_recebido    timestamptz default now()
);

alter table public.pagamentos_recorrentes enable row level security;

drop policy if exists "Allow all for anon" on public.pagamentos_recorrentes;
create policy "Allow all for anon"
  on public.pagamentos_recorrentes for all
  using (true) with check (true);
