-- ============================================================================
--  0004 - Khoa household_id tren profiles + them index cho tinh so du
--
--  Hai viec khong lien quan nhau nhung deu nho va deu la sua schema, gop mot
--  file cho do phai chay hai lan tren dashboard.
--
--  An toan khi chay lai nhieu lan.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. KHONG AI DUOC TU CHUYEN MINH SANG GIA DINH KHAC
--
--  Lo hong: policy profiles_update chi kiem tra `id = auth.uid()`, tuc la
--  "dong nay co phai cua toi khong". No KHONG rang buoc cot household_id.
--  WITH CHECK cua Postgres khong nhin duoc gia tri cu (khong co OLD), nen
--  khong the vá bang cach sua policy - phai dung trigger.
--
--  Khai thac duoc bang mot lenh goi API thang, khong can qua giao dien:
--      supabase.from('profiles')
--              .update({ household_id: '<id gia dinh khac>' })
--              .eq('id', <id cua minh>)
--  Doi xong thi my_household_id() tra ve gia dinh moi, va vi MOI bang con
--  deu phan quyen theo ham do, ke tan cong doc/ghi duoc toan bo thu chi cua
--  gia dinh kia.
--
--  Trong thuc te con phai biet truoc uuid cua gia dinh muc tieu - API khong
--  co duong nao liet ke ra. Nhung "kho doan" khong phai la mot lop bao ve,
--  va ban va thi re.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_household_change()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() rong = lenh khong den tu mot phien dang nhap, tuc la dang chay
  -- tay trong SQL Editor hoac bang service key. Van cho doi, neu khong thi
  -- sau nay chinh chu repo cung khong sua duoc du lieu cua chinh minh.
  if auth.uid() is not null and old.household_id is distinct from new.household_id then
    raise exception 'Khong duoc tu doi gia dinh cua minh';
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_lock_household on public.profiles;
create trigger trg_profiles_lock_household
  before update on public.profiles
  for each row execute function public.prevent_household_change();

-- ---------------------------------------------------------------------------
-- 2. INDEX CHO VIEC TINH SO DU VI
--
--  View v_account_balances quet bang transactions hai lan cho MOI tai khoan:
--  mot lan theo account_id, mot lan theo to_account_id. Migration 0001 moi
--  co index theo occurred_at, payer_id va category_id - chua co cai nao dung
--  duoc cho hai truy van nay.
--
--  Bay gio bang con nho nen Postgres quet toan bang cung xong trong mot cai
--  chop mat. Them san de sau vai nam khoi phai nghi lai.
-- ---------------------------------------------------------------------------
create index if not exists tx_account_idx
  on public.transactions(household_id, account_id);

-- to_account_id rong o moi giao dich khong phai chuyen khoan - phan lon bang.
-- Index mot phan chi chua cac dong that su co gia tri: nho hon nhieu lan va
-- van dung duoc cho dung truy van trong view.
create index if not exists tx_to_account_idx
  on public.transactions(household_id, to_account_id)
  where to_account_id is not null;
