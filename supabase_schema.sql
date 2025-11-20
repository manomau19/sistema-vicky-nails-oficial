-- Tabela de serviços
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0,
  duration integer not null default 0,
  description text,
  created_at timestamp with time zone default now()
);

-- Tabela de agendamentos
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  phone text,
  date date not null,
  time text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  payment_method text,
  notes text,
  attended boolean not null default false,
  created_at timestamp with time zone default now()
);
