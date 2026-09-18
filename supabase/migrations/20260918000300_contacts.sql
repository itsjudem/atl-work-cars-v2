-- ATL Work Cars — 0003: contacts (one row per person) and lead categories

create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  first_name        text not null check (length(btrim(first_name)) between 1 and 50),
  last_name         text not null check (length(btrim(last_name)) between 1 and 50),
  -- Exactly 10 digits with a valid US area code and exchange (same rule as the site).
  phone             text check (phone ~ '^[2-9][0-9]{2}[2-9][0-9]{6}$'),
  email             text check (email = lower(email) and length(email) <= 254
                                and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  zip               text check (zip ~ '^[0-9]{5}$'),
  county            text check (county in (
                      'Gwinnett County', 'Fulton County', 'DeKalb County', 'Cobb County',
                      'Clayton County', 'Other Metro Atlanta county', 'Outside Metro Atlanta')),
  source            public.contact_source not null,
  original_message  text check (length(original_message) <= 2000),
  fit               public.rating,
  intent            public.rating,
  -- Computed by the database from fit and intent. Nobody writes it directly
  -- (writing a generated column is an error).
  lead_category     public.lead_category not null generated always as (
                      case
                        when fit is null or intent is null then 'unrated'::public.lead_category
                        when fit = 'high' and intent = 'high' then 'hot'::public.lead_category
                        when fit = 'high' and intent = 'low'  then 'warm'::public.lead_category
                        when fit = 'low'  and intent = 'high' then 'low_priority'::public.lead_category
                        else 'dead'::public.lead_category
                      end) stored,
  contacted         boolean not null default false,
  contacted_at      timestamptz,
  contacted_by      uuid references public.profiles (id) on delete set null,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint contacts_reachable check (phone is not null or email is not null),
  constraint contacts_contacted_consistent check (contacted = (contacted_at is not null)),
  constraint contacts_message_only_from_form check (original_message is null or source = 'contact_form')
);

create index contacts_phone_idx on public.contacts (phone) where phone is not null;
create index contacts_email_idx on public.contacts (email) where email is not null;
create index contacts_attention_idx on public.contacts (archived_at, contacted, lead_category, created_at desc);

-- Sort order for the "Needs attention" view: Hot, Unrated, Warm, Low-priority, Dead.
create function public.lead_category_rank(c public.lead_category) returns int
language sql immutable parallel safe set search_path = ''
as $$
  select case c when 'hot' then 1 when 'unrated' then 2 when 'warm' then 3
                when 'low_priority' then 4 else 5 end
$$;

-- Normalise, stamp contacted_*, protect write-once fields, bump updated_at.
create function public.contacts_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.first_name := btrim(new.first_name);
  new.last_name  := btrim(new.last_name);
  new.phone      := public.normalize_phone(new.phone);
  new.email      := nullif(lower(btrim(new.email)), '');
  new.zip        := nullif(btrim(new.zip), '');

  if tg_op = 'INSERT' then
    if new.contacted then
      new.contacted_at := coalesce(new.contacted_at, now());
      new.contacted_by := public.actor_id();
    else
      new.contacted_at := null;
      new.contacted_by := null;
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if new.source <> old.source
     or new.original_message is distinct from old.original_message
     or new.created_at <> old.created_at then
    raise exception 'The source, original message and created date cannot be changed.' using errcode = 'AWC08';
  end if;

  -- Who/when is recorded by the database, not supplied by the client.
  if new.contacted and not old.contacted then
    new.contacted_at := now();
    new.contacted_by := public.actor_id();
  elsif not new.contacted and old.contacted then
    new.contacted_at := null;
    new.contacted_by := null;
  else
    new.contacted_at := old.contacted_at;
    new.contacted_by := old.contacted_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger contacts_before_write
  before insert or update on public.contacts
  for each row execute function public.contacts_before_write();
