-- Rumbo 90 · Esquema inicial
-- Jerarquía: ciclo → dimensión → objetivo → hábitos / hitos → compromisos diarios → registros.
-- Multiusuario: cada fila pertenece a un usuario (user_id) y RLS impide ver datos ajenos.

create extension if not exists pgcrypto;

-- Ciclos de 30, 63, 90 días o personalizados
create table ciclos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'activo' check (estado in ('activo', 'cerrado', 'borrador')),
  created_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

create table dimensiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid not null references ciclos on delete cascade,
  nombre text not null,
  orden int not null default 0
);

-- Nivel 1: objetivo de resultado. El tipo define cómo se calcula el avance.
create table objetivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid not null references ciclos on delete cascade,
  dimension_id uuid references dimensiones on delete set null,
  codigo text,
  titulo text not null,
  descripcion text,
  tipo text not null check (tipo in ('meta_numerica', 'conteo', 'promedio', 'proyecto')),
  unidad text,
  valor_inicial numeric,
  valor_meta numeric,
  fecha_meta date,
  prioridad int not null default 2,
  estado text not null default 'activo' check (estado in ('activo', 'logrado', 'pausado', 'descartado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Las metas pueden ajustarse sin perder sus valores históricos
create table objetivos_historial (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  objetivo_id uuid not null references objetivos on delete cascade,
  valores_anteriores jsonb not null,
  motivo text,
  cambiado_en timestamptz not null default now()
);

-- Nivel 2: hábitos. Un hábito puede contribuir a varios objetivos.
create table habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid not null references ciclos on delete cascade,
  titulo text not null,
  -- {"tipo":"dias","dias":[1,3,5]} (0 = domingo) o {"tipo":"veces_semana","veces":3}
  frecuencia jsonb not null default '{"tipo":"dias","dias":[0,1,2,3,4,5,6]}',
  hora time,
  duracion_min int,
  unidad text,
  meta_por_vez numeric,
  version_minima text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table habitos_objetivos (
  habito_id uuid not null references habitos on delete cascade,
  objetivo_id uuid not null references objetivos on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (habito_id, objetivo_id)
);

-- Nivel 2: hitos de proyectos (objetivos de tipo proyecto)
create table hitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  objetivo_id uuid not null references objetivos on delete cascade,
  titulo text not null,
  fecha date,
  responsable text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'hecho', 'bloqueado')),
  orden int not null default 0
);

-- Nivel 3: compromisos diarios. client_id evita duplicados al sincronizar desde offline.
create table compromisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid not null unique,
  fecha date not null,
  hora time,
  duracion_min int,
  titulo text not null,
  habito_id uuid references habitos on delete set null,
  hito_id uuid references hitos on delete set null,
  objetivo_id uuid references objetivos on delete set null,
  en_contrato_semanal boolean not null default false,
  prioridad int not null default 2,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'realizado', 'parcial', 'reprogramado', 'omitido', 'cancelado')),
  motivo text,
  reprogramado_a uuid references compromisos on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nivel 4: mediciones de resultados (peso, VO2 máx., libros, horas estratégicas…)
create table mediciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid not null unique,
  objetivo_id uuid not null references objetivos on delete cascade,
  fecha date not null,
  valor numeric not null,
  unidad text,
  fuente text not null default 'manual' check (fuente in ('manual', 'garmin', 'app')),
  nota text,
  created_at timestamptz not null default now()
);

-- Nivel 4: revisiones diaria, semanal y mensual
create table revisiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  ciclo_id uuid references ciclos on delete cascade,
  tipo text not null check (tipo in ('diaria', 'semanal', 'mensual', 'ciclo')),
  fecha date not null,
  respuestas jsonb not null default '{}',
  puntuacion numeric,
  created_at timestamptz not null default now(),
  unique (user_id, tipo, fecha)
);

create index on compromisos (user_id, fecha);
create index on mediciones (objetivo_id, fecha);
create index on objetivos (ciclo_id);
create index on habitos (ciclo_id);

-- updated_at automático
create function tocar_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger objetivos_updated before update on objetivos
  for each row execute function tocar_updated_at();
create trigger compromisos_updated before update on compromisos
  for each row execute function tocar_updated_at();

-- Guarda los valores previos cuando cambia la definición de una meta
create function registrar_cambio_objetivo() returns trigger language plpgsql as $$
begin
  if (old.titulo, old.valor_inicial, old.valor_meta, old.fecha_meta, old.unidad, old.tipo)
     is distinct from (new.titulo, new.valor_inicial, new.valor_meta, new.fecha_meta, new.unidad, new.tipo) then
    insert into objetivos_historial (user_id, objetivo_id, valores_anteriores)
    values (old.user_id, old.id, jsonb_build_object(
      'titulo', old.titulo, 'valor_inicial', old.valor_inicial, 'valor_meta', old.valor_meta,
      'fecha_meta', old.fecha_meta, 'unidad', old.unidad, 'tipo', old.tipo));
  end if;
  return new;
end $$;

create trigger objetivos_historial_trg after update on objetivos
  for each row execute function registrar_cambio_objetivo();

-- Seguridad por fila: cada usuario solo ve y modifica lo suyo
do $$
declare t text;
begin
  foreach t in array array['ciclos', 'dimensiones', 'objetivos', 'objetivos_historial', 'habitos',
                           'habitos_objetivos', 'hitos', 'compromisos', 'mediciones', 'revisiones']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo_propios" on %I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
