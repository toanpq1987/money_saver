-- ===========================================================================
--  0002 - Sua cach sinh ma moi trong create_household
--
--  Van de: ban 0001 dung gen_random_bytes() cua extension pgcrypto. Tren
--  Supabase pgcrypto duoc cai vao schema "extensions", trong khi ham nay
--  khai bao "set search_path = public" -> Postgres khong tim thay ham, nem
--  loi, khien khong ai tao duoc so gia dinh.
--
--  Cach sua: dung gen_random_uuid() - ham co san cua PostgreSQL tu ban 13,
--  khong phu thuoc extension nao.
--
--  Tien the: ma moi gio chi gom 0-9 va A-F nen khong lan chu O voi so 0,
--  hay chu I voi so 1 khi doc ma cho nhau qua dien thoai.
--
--  Chi thay the than ham, khong dung den bang hay du lieu nao.
-- ===========================================================================
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

  -- Sinh ma moi 6 ky tu, tranh trung.
  --
  -- Dung gen_random_uuid() chu KHONG dung gen_random_bytes(): tren Supabase
  -- pgcrypto nam trong schema "extensions", ma ham nay khai bao
  -- "set search_path = public" nen se khong thay gen_random_bytes.
  -- gen_random_uuid() la ham co san cua PostgreSQL nen luon goi duoc.
  --
  -- Chuoi hex chi gom 0-9 va A-F nen khong bao gio lan chu O voi so 0,
  -- hay chu I voi so 1 khi doc ma cho nhau qua dien thoai.
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
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
