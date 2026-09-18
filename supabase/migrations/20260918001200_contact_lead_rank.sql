-- ATL Work Cars — 0012: sort order for the Contacts "Needs attention" view.
-- Hot → Unrated → Warm → Low-priority → Dead, computed by the database from
-- fit and intent (the same rules as lead_category), so the list can sort on it.

alter table public.contacts
  add column lead_rank smallint not null generated always as (
    case
      when fit is null or intent is null then 2          -- unrated
      when fit = 'high' and intent = 'high' then 1       -- hot
      when fit = 'high' and intent = 'low'  then 3       -- warm
      when fit = 'low'  and intent = 'high' then 4       -- low-priority
      else 5                                             -- dead
    end) stored;

create index contacts_needs_attention_idx
  on public.contacts (lead_rank, created_at desc)
  where archived_at is null and not contacted;
