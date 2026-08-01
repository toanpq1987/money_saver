-- ============================================================================
--  MoneySaver - Schema quan ly chi tieu gia dinh
--  Chay toan bo file nay 1 lan trong: Supabase Dashboard > SQL Editor > New query
--  An toan khi chay lai nhieu lan (idempotent).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. BANG
-- ---------------------------------------------------------------------------

-- Mot "household" = mot gia dinh. Moi thanh vien deu thay chung du lieu.
create table if not exists public.households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  currency     text not null default 'VND',
  created_at   timestamptz not null default now()
);

-- Ho so thanh vien, noi auth.users voi household.
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  display_name  text not null,
  role          text not null default 'other' check (role in ('husband','wife','other')),
  avatar_emoji  text not null default '🙂',
  color         text not null default '#328ffb',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists profiles_household_idx on public.profiles(household_id);

-- Danh muc thu / chi.
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  icon          text not null default '📦',
  color         text not null default '#8595ae',
  kind          text not null default 'expense' check (kind in ('expense','income')),
  sort_order    int  not null default 100,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists categories_household_idx on public.categories(household_id, kind);

-- Vi / tai khoan: tien mat, ngan hang, vi dien tu, the tin dung.
-- owner_id = null  => vi CHUNG cua gia dinh
-- owner_id = <uid> => vi RIENG cua nguoi do
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  owner_id        uuid references public.profiles(id) on delete set null,
  name            text not null,
  kind            text not null default 'cash' check (kind in ('cash','bank','ewallet','credit')),
  icon            text not null default '👛',
  color           text not null default '#328ffb',
  opening_balance numeric(16,2) not null default 0,
  archived        boolean not null default false,
  sort_order      int not null default 100,
  created_at      timestamptz not null default now()
);
create index if not exists accounts_household_idx on public.accounts(household_id);

-- Giao dich: chi / thu / chuyen khoan giua 2 vi.
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  type           text not null check (type in ('expense','income','transfer')),
  amount         numeric(16,2) not null check (amount > 0),
  occurred_at    date not null default current_date,
  category_id    uuid references public.categories(id) on delete set null,
  account_id     uuid references public.accounts(id) on delete set null,
  to_account_id  uuid references public.accounts(id) on delete set null,
  -- Ai la nguoi chi/thu khoan nay (dung cho tab rieng cua vo & chong)
  payer_id       uuid not null references public.profiles(id) on delete cascade,
  -- true = chi tieu chung cua gia dinh, false = chi tieu ca nhan
  is_shared      boolean not null default true,
  note           text not null default '',
  created_by     uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint transfer_needs_target check (type <> 'transfer' or to_account_id is not null),
  constraint transfer_distinct_accounts check (to_account_id is null or to_account_id <> account_id)
);
create index if not exists tx_household_date_idx on public.transactions(household_id, occurred_at desc);
create index if not exists tx_payer_idx on public.transactions(household_id, payer_id);
create index if not exists tx_category_idx on public.transactions(household_id, category_id);

-- Ngan sach theo danh muc theo thang. month luon la ngay 01 cua thang.
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  month         date not null,
  amount        numeric(16,2) not null check (amount >= 0),
  created_at    timestamptz not null default now(),
  unique (household_id, category_id, month)
);
create index if not exists budgets_household_month_idx on public.budgets(household_id, month);

-- Quy muc tieu tiet kiem (mua nha, du lich, quy du phong...).
create table if not exists public.savings_goals (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  target_amount numeric(16,2) not null check (target_amount > 0),
  deadline      date,
  icon          text not null default '🎯',
  color         text not null default '#22c55e',
  note          text not null default '',
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists goals_household_idx on public.savings_goals(household_id);

-- Moi lan nap / rut khoi quy muc tieu.
create table if not exists public.savings_entries (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  goal_id       uuid not null references public.savings_goals(id) on delete cascade,
  amount        numeric(16,2) not null check (amount > 0),
  direction     text not null default 'in' check (direction in ('in','out')),
  occurred_at   date not null default current_date,
  note          text not null default '',
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists savings_entries_goal_idx on public.savings_entries(goal_id, occurred_at desc);

-- So tiet kiem ngan hang co ky han + lai suat.
create table if not exists public.deposits (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  bank_name       text not null,
  principal       numeric(16,2) not null check (principal > 0),
  interest_rate   numeric(6,3) not null default 0,   -- %/nam
  term_months     int not null default 6 check (term_months > 0),
  opened_at       date not null default current_date,
  -- 'end' = lanh lai cuoi ky, 'monthly' = lai hang thang, 'compound' = tai tuc
  interest_type   text not null default 'end' check (interest_type in ('end','monthly','compound')),
  owner_id        uuid references public.profiles(id) on delete set null,
  note            text not null default '',
  status          text not null default 'active' check (status in ('active','closed')),
  created_at      timestamptz not null default now()
);
create index if not exists deposits_household_idx on public.deposits(household_id, status);

-- Vay / cho vay.
create table if not exists public.debts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  direction     text not null check (direction in ('lend','borrow')), -- lend = minh cho vay
  counterparty  text not null,
  amount        numeric(16,2) not null check (amount > 0),
  paid_amount   numeric(16,2) not null default 0 check (paid_amount >= 0),
  due_date      date,
  occurred_at   date not null default current_date,
  note          text not null default '',
  profile_id    uuid references public.profiles(id) on delete set null,
  settled       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists debts_household_idx on public.debts(household_id, settled);

-- Hoa don / khoan chi lap lai hang thang (tien nha, internet, hoc phi...).
create table if not exists public.recurring_bills (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  name          text not null,
  amount        numeric(16,2) not null check (amount > 0),
  category_id   uuid references public.categories(id) on delete set null,
  account_id    uuid references public.accounts(id) on delete set null,
  day_of_month  int not null default 1 check (day_of_month between 1 and 31),
  active        boolean not null default true,
  last_paid_on  date,
  note          text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists bills_household_idx on public.recurring_bills(household_id, active);

-- ---------------------------------------------------------------------------
-- 2. TRIGGER updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_tx_touch on public.transactions;
create trigger trg_tx_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. HAM TIEN ICH
--    SECURITY DEFINER de tranh de quy vo han khi policy cua profiles
--    lai phai doc chinh bang profiles.
-- ---------------------------------------------------------------------------
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;
revoke all on function public.my_household_id() from public;
grant execute on function public.my_household_id() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. VIEW: so du tung vi (tinh tu so du dau + cac giao dich)
-- ---------------------------------------------------------------------------
create or replace view public.v_account_balances
with (security_invoker = true) as
select
  a.id            as account_id,
  a.household_id,
  a.opening_balance
    + coalesce((
        select sum(case
                     when t.type = 'income'   then  t.amount
                     when t.type = 'expense'  then -t.amount
                     when t.type = 'transfer' then -t.amount
                   end)
        from public.transactions t
        where t.account_id = a.id
      ), 0)
    + coalesce((
        select sum(t.amount)
        from public.transactions t
        where t.to_account_id = a.id and t.type = 'transfer'
      ), 0)
  as balance
from public.accounts a;

-- ---------------------------------------------------------------------------
-- 5. RLS - moi nguoi chi doc/ghi duoc du lieu cua gia dinh minh
-- ---------------------------------------------------------------------------
alter table public.households      enable row level security;
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.accounts        enable row level security;
alter table public.transactions    enable row level security;
alter table public.budgets         enable row level security;
alter table public.savings_goals   enable row level security;
alter table public.savings_entries enable row level security;
alter table public.deposits        enable row level security;
alter table public.debts           enable row level security;
alter table public.recurring_bills enable row level security;

-- households: doc + sua gia dinh cua minh
drop policy if exists households_rw on public.households;
create policy households_rw on public.households
  for all to authenticated
  using (id = public.my_household_id())
  with check (id = public.my_household_id());

-- profiles: thay moi thanh vien trong nha; chi sua duoc ho so cua chinh minh
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (household_id = public.my_household_id() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cac bang du lieu con: dung chung 1 khuon policy theo household_id.
do $$
declare t text;
begin
  foreach t in array array[
    'categories','accounts','transactions','budgets','savings_goals',
    'savings_entries','deposits','debts','recurring_bills'
  ] loop
    execute format('drop policy if exists %1$s_rw on public.%1$I', t);
    execute format($f$
      create policy %1$s_rw on public.%1$I
        for all to authenticated
        using (household_id = public.my_household_id())
        with check (household_id = public.my_household_id())
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. RPC: tao gia dinh moi (kem danh muc + vi mac dinh)
-- ---------------------------------------------------------------------------
create or replace function public.create_household(
  p_household_name text,
  p_display_name   text,
  p_role           text default 'other'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_house public.households;
  v_code  text;
begin
  if v_uid is null then
    raise exception 'Chua dang nhap';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Tai khoan nay da thuoc mot gia dinh';
  end if;

  -- Sinh ma moi 6 ky tu, tranh trung
  loop
    v_code := upper(substr(replace(encode(gen_random_bytes(8), 'base64'), '/', ''), 1, 6));
    v_code := translate(v_code, '+=OI01', 'XYZWTU');
    exit when not exists (select 1 from public.households where invite_code = v_code);
  end loop;

  insert into public.households (name, invite_code)
  values (coalesce(nullif(trim(p_household_name), ''), 'Gia đình'), v_code)
  returning * into v_house;

  insert into public.profiles (id, household_id, display_name, role, avatar_emoji, color)
  values (
    v_uid, v_house.id,
    coalesce(nullif(trim(p_display_name), ''), 'Thành viên'),
    case when p_role in ('husband','wife','other') then p_role else 'other' end,
    case p_role when 'husband' then '👨' when 'wife' then '👩' else '🙂' end,
    case p_role when 'husband' then '#2a78d6' when 'wife' then '#e87ba4' else '#898781' end
  );

  -- Danh muc chi tieu mac dinh.
  -- Mau lay tu bang mau da kiem tra do phan biet cho nguoi mu mau (xem README).
  insert into public.categories (household_id, name, icon, color, kind, sort_order) values
    (v_house.id, 'Ăn uống',        '🍜', '#2a78d6', 'expense', 10),
    (v_house.id, 'Đi chợ / Siêu thị','🛒','#eb6834', 'expense', 20),
    (v_house.id, 'Di chuyển',      '🛵', '#1baf7a', 'expense', 30),
    (v_house.id, 'Nhà cửa',        '🏠', '#eda100', 'expense', 40),
    (v_house.id, 'Hóa đơn',        '🧾', '#e87ba4', 'expense', 50),
    (v_house.id, 'Sức khỏe',       '💊', '#008300', 'expense', 60),
    (v_house.id, 'Con cái',        '🧸', '#4a3aa7', 'expense', 70),
    (v_house.id, 'Mua sắm',        '🛍️', '#e34948', 'expense', 80),
    (v_house.id, 'Giải trí',       '🎬', '#2a78d6', 'expense', 90),
    (v_house.id, 'Giáo dục',       '📚', '#eb6834', 'expense', 100),
    (v_house.id, 'Hiếu hỉ',        '🎁', '#1baf7a', 'expense', 110),
    (v_house.id, 'Khác',           '📦', '#898781', 'expense', 900),
    (v_house.id, 'Lương',          '💰', '#008300', 'income',  10),
    (v_house.id, 'Thưởng',         '🏆', '#eda100', 'income',  20),
    (v_house.id, 'Kinh doanh',     '📈', '#2a78d6', 'income',  30),
    (v_house.id, 'Lãi tiết kiệm',  '🏦', '#1baf7a', 'income',  40),
    (v_house.id, 'Thu khác',       '✨', '#898781', 'income',  900);

  -- Vi mac dinh
  insert into public.accounts (household_id, owner_id, name, kind, icon, color, sort_order)
  values (v_house.id, null, 'Tiền mặt', 'cash', '💵', '#008300', 10);

  insert into public.accounts (household_id, owner_id, name, kind, icon, color, sort_order)
  values (v_house.id, null, 'Tài khoản ngân hàng', 'bank', '🏦', '#2a78d6', 20);

  return v_house;
end $$;
revoke all on function public.create_household(text,text,text) from public;
grant execute on function public.create_household(text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC: tham gia gia dinh bang ma moi
-- ---------------------------------------------------------------------------
create or replace function public.join_household(
  p_invite_code  text,
  p_display_name text,
  p_role         text default 'other'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_house public.households;
begin
  if v_uid is null then
    raise exception 'Chua dang nhap';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Tai khoan nay da thuoc mot gia dinh';
  end if;

  select * into v_house from public.households
  where invite_code = upper(trim(p_invite_code));

  if v_house.id is null then
    raise exception 'Ma moi khong dung';
  end if;

  insert into public.profiles (id, household_id, display_name, role, avatar_emoji, color)
  values (
    v_uid, v_house.id,
    coalesce(nullif(trim(p_display_name), ''), 'Thành viên'),
    case when p_role in ('husband','wife','other') then p_role else 'other' end,
    case p_role when 'husband' then '👨' when 'wife' then '👩' else '🙂' end,
    case p_role when 'husband' then '#2a78d6' when 'wife' then '#e87ba4' else '#898781' end
  );

  return v_house;
end $$;
revoke all on function public.join_household(text,text,text) from public;
grant execute on function public.join_household(text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. REALTIME - de 2 dien thoai thay thay doi cua nhau ngay lap tuc
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'transactions','categories','accounts','budgets','savings_goals',
    'savings_entries','deposits','debts','recurring_bills','profiles','households'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
