-- 6 categorías de vida con 3 subcategorías cada una, estado por categoría y evaluación mensual.
-- Las "dimensiones" pasan a ser las categorías de la app.

alter table dimensiones
  add column estado text not null default 'prioritaria' check (estado in ('prioritaria', 'mantenimiento', 'sin_foco')),
  add column descripcion text;

create table subcategorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  dimension_id uuid not null references dimensiones on delete cascade,
  nombre text not null,
  orden int not null default 0
);
create index subcategorias_dimension on subcategorias (dimension_id);

alter table objetivos add column subcategoria_id uuid references subcategorias on delete set null;

-- Satisfacción mensual de 1 a 10 por categoría, independiente del cumplimiento de metas
create table evaluaciones_dimension (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  dimension_id uuid not null references dimensiones on delete cascade,
  mes date not null,
  puntaje int not null check (puntaje between 1 and 10),
  nota text,
  created_at timestamptz not null default now(),
  unique (dimension_id, mes)
);

do $$
declare t text;
begin
  foreach t in array array['subcategorias', 'evaluaciones_dimension']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo_propios" on %I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Crea (o completa) las 6 categorías y sus subcategorías en un ciclo. Idempotente.
-- Corre con los permisos de quien la llama: desde la app, la seguridad por fila limita a los ciclos propios.
create or replace function crear_categorias_base(p_ciclo uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_user uuid;
  v_dim uuid;
  cat record;
  i int;
begin
  select user_id into v_user from ciclos where id = p_ciclo;
  if v_user is null then
    raise exception 'Ciclo inexistente';
  end if;

  for cat in
    select * from (values
      (0, 'Salud y bienestar', 'prioritaria', 'Cuidar el cuerpo, mejorar la condición física y sostener la energía.',
        array['Alimentación y composición corporal', 'Condición física y deporte', 'Salud preventiva y descanso'],
        array['Salud y condición física']),
      (1, 'Desarrollo personal', 'prioritaria', 'Aprender, desarrollar disciplina y mejorar capacidades personales.',
        array['Aprendizaje y conocimientos', 'Hábitos y autodisciplina', 'Bienestar emocional y autoconocimiento'],
        array[]::text[]),
      (2, 'Desarrollo profesional', 'prioritaria', 'Lograr resultados laborales y evolucionar profesionalmente.',
        array['Estrategia y proyectos', 'Liderazgo y equipos', 'Productividad y gestión del tiempo'],
        array[]::text[]),
      (3, 'Relaciones y vínculos', 'mantenimiento', 'Fortalecer los vínculos y dedicar tiempo de calidad a las personas importantes.',
        array['Pareja y familia', 'Amistades y vida social', 'Comunidad y contribución'],
        array[]::text[]),
      (4, 'Finanzas y patrimonio', 'mantenimiento', 'Construir seguridad económica y administrar recursos con intención.',
        array['Planificación financiera', 'Inversiones y patrimonio', 'Administración y consumo'],
        array[]::text[]),
      (5, 'Experiencias y disfrute', 'mantenimiento', 'Reservar tiempo para vivir experiencias, no para medir cuán productivo sos durante ellas.',
        array['Viajes y aventuras', 'Hobbies y creatividad', 'Ocio y tiempo libre'],
        array[]::text[])
    ) as t(orden, nombre, estado, descripcion, subs, alias)
  loop
    select id into v_dim from dimensiones
      where ciclo_id = p_ciclo and (nombre = cat.nombre or nombre = any(cat.alias))
      order by orden limit 1;

    if v_dim is null then
      insert into dimensiones (user_id, ciclo_id, nombre, orden, estado, descripcion)
        values (v_user, p_ciclo, cat.nombre, cat.orden, cat.estado, cat.descripcion)
        returning id into v_dim;
    else
      update dimensiones
        set nombre = cat.nombre, orden = cat.orden, descripcion = coalesce(descripcion, cat.descripcion)
        where id = v_dim;
    end if;

    if not exists (select 1 from subcategorias where dimension_id = v_dim) then
      for i in 1 .. array_length(cat.subs, 1) loop
        insert into subcategorias (user_id, dimension_id, nombre, orden) values (v_user, v_dim, cat.subs[i], i - 1);
      end loop;
    end if;
  end loop;
end $$;

-- Completar los ciclos que ya existen
do $$
declare c record;
begin
  for c in select id from ciclos loop
    perform crear_categorias_base(c.id);
  end loop;
end $$;
