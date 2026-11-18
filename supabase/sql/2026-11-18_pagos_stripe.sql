-- =====================================================================
-- MAREA — Cobro automático con tarjeta (Stripe) · v2.3
-- Cómo correrlo: Supabase -> SQL Editor -> hoja nueva -> pegar todo -> Run.
-- Se puede correr más de una vez sin problema.
-- =====================================================================
alter table clients            add column if not exists stripe_customer_id     text;
alter table client_memberships add column if not exists stripe_subscription_id text;
alter table client_memberships add column if not exists cancel_at_period_end   boolean not null default false;
alter table payments           add column if not exists provider_payment_id    text;

create unique index if not exists client_memberships_stripe_sub_key on client_memberships (stripe_subscription_id);
create unique index if not exists payments_provider_payment_key    on payments (provider_payment_id);
create index        if not exists clients_stripe_customer_idx      on clients (stripe_customer_id);

-- Revisión
select 'Columnas de Stripe' as revision,
       case when count(*) = 4 then '4 de 4 ✅' else count(*)::text || ' de 4 ❌' end as resultado
  from information_schema.columns
 where table_schema = 'public'
   and (table_name, column_name) in (('clients','stripe_customer_id'), ('client_memberships','stripe_subscription_id'),
                                     ('client_memberships','cancel_at_period_end'), ('payments','provider_payment_id'));
