-- ============================================================================
--  0003 - Nhat ky hoat dong (activity log)
--
--  Muc dich: hai vo chong dung chung mot so. Khi mot khoan bi sua hoac bien
--  mat ma khong ai nho da lam gi, phai co cho tra cuu: ai sua, luc nao, tu
--  gia tri nao sang gia tri nao.
--
--  Ghi o tang DATABASE bang trigger chu khong phai o app, vi hai ly do:
--    - Thao tac gui len tu hang doi offline cung duoc ghi day du.
--    - Khong the sot do quen goi ham log o mot nhanh code nao do.
--
--  An toan khi chay lai nhieu lan.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BANG
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  -- CO Y KHONG dat khoa ngoai toi profiles: neu ho so bi xoa thi dong log van
  -- phai con. Quan trong hon, mot khoa ngoai hong se lam HONG LUON thao tac
  -- goc (them/sua giao dich) - nhat ky khong duoc phep can tro viec ghi tien.
  actor_id      uuid,
  table_name    text not null,
  record_id     uuid not null,
  action        text not null check (action in ('insert','update','delete')),
  -- Chi rieng cac truong da doi: { "amount": { "from": 200000, "to": 250000 } }
  changed       jsonb,
  -- Ban ghi sau thay doi, hoac ban ghi truoc khi xoa. Can de con hien duoc
  -- "An trua 200k" cho mot dong da bi xoa khoi bang goc.
  snapshot      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists activity_log_household_idx
  on public.activity_log(household_id, created_at desc);
create index if not exists activity_log_record_idx
  on public.activity_log(record_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. TRIGGER GHI LOG - dung chung cho moi bang co household_id va id
-- ---------------------------------------------------------------------------
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household uuid;
  v_record    uuid;
  v_old       jsonb;
  v_new       jsonb;
  v_changed   jsonb := '{}'::jsonb;
  v_snapshot  jsonb;
  k           text;
begin
  if tg_op = 'DELETE' then
    v_snapshot  := to_jsonb(old);
    v_record    := old.id;
    v_household := old.household_id;
  else
    v_snapshot  := to_jsonb(new);
    v_record    := new.id;
    v_household := new.household_id;
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);

    for k in select jsonb_object_keys(v_new) loop
      -- updated_at doi o MOI lan update nen khong noi len dieu gi
      continue when k = 'updated_at';
      if (v_old -> k) is distinct from (v_new -> k) then
        v_changed := v_changed || jsonb_build_object(
          k, jsonb_build_object('from', v_old -> k, 'to', v_new -> k)
        );
      end if;
    end loop;

    -- Luu lai form cu roi bam Luu ma khong doi gi -> khong dang ghi vao nhat ky
    if v_changed = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into public.activity_log (
    household_id, actor_id, table_name, record_id, action, changed, snapshot
  )
  values (
    v_household, auth.uid(), tg_table_name, v_record, lower(tg_op),
    nullif(v_changed, '{}'::jsonb), v_snapshot
  );

  return null; -- trigger AFTER: gia tri tra ve khong duoc dung den
end $$;

-- Chi gan cho cac bang lien quan truc tiep den tien. Muon them bang khac thi
-- chi can lap lai khoi duoi day - ham tren viet chung cho moi bang.
drop trigger if exists trg_transactions_log on public.transactions;
create trigger trg_transactions_log
  after insert or update or delete on public.transactions
  for each row execute function public.log_activity();

drop trigger if exists trg_accounts_log on public.accounts;
create trigger trg_accounts_log
  after insert or update or delete on public.accounts
  for each row execute function public.log_activity();

-- ---------------------------------------------------------------------------
-- 3. RLS + QUYEN
--
-- Nhat ky chi de DOC. Khong cap quyen ghi cho nguoi dung: chi trigger o tren
-- (SECURITY DEFINER, chay bang quyen chu so huu) moi duoc them dong moi. Nho
-- vay khong ai sua duoc dau vet cua chinh minh.
--
-- Phai revoke tuong minh vi migration 0001 co dat "alter default privileges"
-- cap san select/insert/update/delete cho moi bang tao ve sau.
-- ---------------------------------------------------------------------------
alter table public.activity_log enable row level security;

drop policy if exists activity_log_select on public.activity_log;
create policy activity_log_select on public.activity_log
  for select to authenticated
  using (household_id = public.my_household_id());

revoke all on public.activity_log from authenticated;
grant select on public.activity_log to authenticated;

-- ---------------------------------------------------------------------------
-- 4. REALTIME - nhat ky hien ngay tren may con lai
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.activity_log';
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
