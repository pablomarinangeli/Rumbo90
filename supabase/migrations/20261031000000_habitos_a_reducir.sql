-- Hábitos a reducir o eliminar (ej. "pedir delivery como máximo 2 veces por semana")
alter table habitos
  add column tipo text not null default 'construir' check (tipo in ('construir', 'reducir')),
  add column limite_semana int check (limite_semana >= 0);

comment on column habitos.limite_semana is 'Solo para tipo reducir: máximo de veces por semana (0 = eliminar)';

-- Cada vez que el hábito a reducir ocurre (ej. cada pedido de delivery)
create table registros_habito (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habito_id uuid not null references habitos on delete cascade,
  fecha date not null default current_date,
  client_id uuid not null unique,
  nota text,
  created_at timestamptz not null default now()
);

create index registros_habito_habito_fecha on registros_habito (habito_id, fecha);

alter table registros_habito enable row level security;
create policy "solo_propios" on registros_habito for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
