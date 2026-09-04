-- =====================================================================
-- CLB Cầu Lông — Schema khởi tạo
-- Phạm vi: 1 CLB duy nhất. Admin + member đều đăng nhập bằng Supabase Auth.
-- Buổi đánh: cố định hàng tuần + phát sinh. Quỹ tính THEO THÁNG (không theo buổi).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists "unaccent" with schema extensions;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type public.sex as enum ('nam', 'nu');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  -- fixed  = buổi cố định hàng tuần (đã nằm trong quỹ tháng)
  -- extra  = buổi phát sinh (không ảnh hưởng quỹ tháng)
  create type public.session_type as enum ('fixed', 'extra');
exception when duplicate_object then null; end $$;

do $$ begin
  -- draft     = đã tạo, chưa mở đăng ký
  -- open      = đang mở đăng ký / đang diễn ra
  -- closed    = đã chốt buổi (đã ghi sổ quỹ)
  -- cancelled = đã hủy
  create type public.session_status as enum ('draft', 'open', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rsvp_status as enum ('registered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('pending', 'present', 'absent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fee_status as enum ('unpaid', 'paid', 'waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.period_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Dấu của fund_entries.amount: dương = thu, âm = chi
  create type public.fund_entry_type as enum (
    'monthly_fee',      -- (+) thu quỹ tháng của thành viên
    'guest_fee',        -- (+) thu tiền khách trong buổi
    'session_expense',  -- (-) chi sân + cầu của một buổi
    'other_income',     -- (+) thu khác
    'other_expense',    -- (-) chi khác (mua cầu dự trữ, nước…)
    'adjustment'        -- (+/-) điều chỉnh thủ công
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- HÀM TIỆN ÍCH
-- ---------------------------------------------------------------------
create or replace function public.slugify(p_text text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(lower(extensions.unaccent(coalesce(p_text, ''))), '[^a-z0-9]+', '-', 'g')
    ), '');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. CẤU HÌNH CLB (đúng 1 dòng, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.club_settings (
  id                  smallint     primary key default 1 check (id = 1),
  club_name           text         not null default 'CLB Cầu Lông',
  default_court       text,
  -- Mức quỹ tháng
  monthly_fee_male    numeric(12,2) not null default 400000 check (monthly_fee_male >= 0),
  monthly_fee_female  numeric(12,2) not null default 280000 check (monthly_fee_female >= 0),
  -- Phí khách theo buổi
  guest_fee_male      numeric(12,2) not null default 70000 check (guest_fee_male >= 0),
  guest_fee_female    numeric(12,2) not null default 49000 check (guest_fee_female >= 0),
  -- Tỷ lệ gợi ý cho nữ (chỉ dùng để tính sẵn trên UI, không ràng buộc)
  female_ratio        numeric(5,4) not null default 0.7 check (female_ratio > 0 and female_ratio <= 1),
  fee_due_day         smallint     not null default 5 check (fee_due_day between 1 and 28),
  timezone            text         not null default 'Asia/Ho_Chi_Minh',
  onboarding_done     boolean      not null default false,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

comment on table public.club_settings is 'Cấu hình CLB — luôn chỉ có 1 dòng (id = 1).';

drop trigger if exists trg_club_settings_updated_at on public.club_settings;
create trigger trg_club_settings_updated_at
  before update on public.club_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. THÀNH VIÊN
-- ---------------------------------------------------------------------
create table if not exists public.members (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          unique references auth.users(id) on delete set null,
  full_name   text          not null check (length(btrim(full_name)) > 0),
  slug        text          not null unique,
  sex         public.sex    not null,
  phone       text,
  email       text,
  avatar_url  text,
  role        public.member_role   not null default 'member',
  status      public.member_status not null default 'active',
  joined_at   date          not null default current_date,
  left_at     date,
  note        text,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now(),
  constraint members_left_after_joined check (left_at is null or left_at >= joined_at)
);

comment on column public.members.user_id is 'Null nếu thành viên chưa có tài khoản đăng nhập (vẫn điểm danh được qua link RSVP).';
comment on column public.members.sex is 'Quyết định mức quỹ tháng và phí khách. Chỉ admin được sửa.';
comment on column public.members.slug is 'Dùng cho URL /admin/members/[slug], sinh tự động từ full_name.';

create index if not exists idx_members_status on public.members (status);
create index if not exists idx_members_role   on public.members (role);

-- Sinh slug tự động, tự thêm hậu tố nếu trùng
create or replace function public.members_set_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_i    int := 1;
begin
  if new.slug is null or btrim(new.slug) = '' or
     (tg_op = 'UPDATE' and new.full_name is distinct from old.full_name and new.slug = old.slug) then
    v_base := coalesce(public.slugify(new.full_name), 'thanh-vien');
    v_slug := v_base;
    while exists (select 1 from public.members m where m.slug = v_slug and m.id <> new.id) loop
      v_i := v_i + 1;
      v_slug := v_base || '-' || v_i;
    end loop;
    new.slug := v_slug;
  end if;
  return new;
end $$;

drop trigger if exists trg_members_slug on public.members;
create trigger trg_members_slug
  before insert or update on public.members
  for each row execute function public.members_set_slug();

drop trigger if exists trg_members_updated_at on public.members;
create trigger trg_members_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. LỊCH CỐ ĐỊNH HÀNG TUẦN
-- ---------------------------------------------------------------------
create table if not exists public.fixed_schedules (
  id         uuid        primary key default gen_random_uuid(),
  weekday    smallint    not null check (weekday between 0 and 6), -- 0 = Chủ Nhật … 6 = Thứ Bảy
  start_time time        not null,
  end_time   time        not null,
  court      text,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixed_schedules_time_order check (end_time > start_time),
  constraint fixed_schedules_unique_slot unique (weekday, start_time)
);

comment on table public.fixed_schedules is 'Khung giờ cố định hàng tuần, dùng để sinh sessions type = fixed.';

drop trigger if exists trg_fixed_schedules_updated_at on public.fixed_schedules;
create trigger trg_fixed_schedules_updated_at
  before update on public.fixed_schedules
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. BUỔI ĐÁNH
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
  id                  uuid                  primary key default gen_random_uuid(),
  slug                text                  not null unique,
  play_date           date                  not null,
  start_time          time                  not null,
  end_time            time                  not null,
  court               text,
  session_type        public.session_type   not null default 'fixed',
  status              public.session_status not null default 'draft',
  fixed_schedule_id   uuid references public.fixed_schedules(id) on delete set null,
  -- Slot khách
  guest_slots_enabled boolean       not null default false,
  guest_slots_max     smallint      not null default 0 check (guest_slots_max >= 0),
  guest_fee_male      numeric(12,2) not null default 0 check (guest_fee_male >= 0),
  guest_fee_female    numeric(12,2) not null default 0 check (guest_fee_female >= 0),
  -- Chi phí buổi (điền lúc chốt buổi)
  court_cost          numeric(12,2) not null default 0 check (court_cost >= 0),
  shuttle_cost        numeric(12,2) not null default 0 check (shuttle_cost >= 0),
  other_cost          numeric(12,2) not null default 0 check (other_cost >= 0),
  total_cost          numeric(12,2) generated always as (court_cost + shuttle_cost + other_cost) stored,
  note                text,
  rsvp_opens_at       timestamptz,
  rsvp_closes_at      timestamptz,
  closed_at           timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,
  created_by          uuid references public.members(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint sessions_time_order check (end_time > start_time),
  constraint sessions_unique_slot unique (play_date, start_time)
);

comment on column public.sessions.slug is 'Dùng cho link RSVP công khai /rsvp/[slug], ví dụ 2026-08-27-toi.';
comment on column public.sessions.session_type is 'fixed = buổi cố định (thành viên không trả thêm); extra = buổi phát sinh.';
comment on column public.sessions.guest_fee_male is 'Chụp lại mức phí khách tại thời điểm tạo buổi để lịch sử không đổi khi sửa cấu hình.';

create index if not exists idx_sessions_play_date on public.sessions (play_date desc);
create index if not exists idx_sessions_status    on public.sessions (status);

-- Sinh slug buổi: <ngày>-<buổi trong ngày>, tự thêm hậu tố nếu trùng
create or replace function public.sessions_set_slug()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_part text;
  v_base text;
  v_slug text;
  v_i    int := 1;
begin
  if new.slug is null or btrim(new.slug) = '' then
    v_part := case
      when new.start_time < time '12:00' then 'sang'
      when new.start_time < time '17:00' then 'chieu'
      else 'toi'
    end;
    v_base := to_char(new.play_date, 'YYYY-MM-DD') || '-' || v_part;
    v_slug := v_base;
    while exists (select 1 from public.sessions s where s.slug = v_slug and s.id <> new.id) loop
      v_i := v_i + 1;
      v_slug := v_base || '-' || v_i;
    end loop;
    new.slug := v_slug;
  end if;
  return new;
end $$;

drop trigger if exists trg_sessions_slug on public.sessions;
create trigger trg_sessions_slug
  before insert on public.sessions
  for each row execute function public.sessions_set_slug();

drop trigger if exists trg_sessions_updated_at on public.sessions;
create trigger trg_sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. ĐĂNG KÝ & ĐIỂM DANH
--    Một dòng = một người trong một buổi (thành viên HOẶC khách).
-- ---------------------------------------------------------------------
create table if not exists public.session_attendees (
  id          uuid    primary key default gen_random_uuid(),
  session_id  uuid    not null references public.sessions(id) on delete cascade,
  member_id   uuid    references public.members(id) on delete cascade,
  guest_name  text,
  guest_sex   public.sex,
  invited_by  uuid    references public.members(id) on delete set null,
  is_guest    boolean generated always as (member_id is null) stored,
  rsvp_status       public.rsvp_status       not null default 'registered',
  attendance        public.attendance_status not null default 'pending',
  guest_fee   numeric(12,2) not null default 0 check (guest_fee >= 0),
  guest_paid  boolean       not null default false,
  registered_at timestamptz not null default now(),
  checked_at    timestamptz,
  note        text,
  constraint session_attendees_member_or_guest check (
    (member_id is not null and guest_name is null and guest_sex is null)
    or
    (member_id is null and guest_name is not null and guest_sex is not null)
  ),
  constraint session_attendees_guest_fee_only_for_guest check (
    member_id is null or guest_fee = 0
  )
);

comment on table public.session_attendees is 'Đăng ký + điểm danh. attendance = pending cho tới khi admin chốt buổi.';

create unique index if not exists uq_session_attendees_member
  on public.session_attendees (session_id, member_id)
  where member_id is not null;

create index if not exists idx_session_attendees_session on public.session_attendees (session_id);
create index if not exists idx_session_attendees_member  on public.session_attendees (member_id);

-- ---------------------------------------------------------------------
-- 6. KỲ QUỸ THÁNG
-- ---------------------------------------------------------------------
create table if not exists public.fee_periods (
  id           uuid                 primary key default gen_random_uuid(),
  period_month date                 not null unique,
  fee_male     numeric(12,2)        not null check (fee_male >= 0),
  fee_female   numeric(12,2)        not null check (fee_female >= 0),
  due_date     date,
  status       public.period_status not null default 'open',
  closed_at    timestamptz,
  created_at   timestamptz          not null default now(),
  constraint fee_periods_month_is_first_day check (extract(day from period_month) = 1)
);

comment on table public.fee_periods is 'Mỗi tháng một dòng. fee_male/fee_female chụp lại mức quỹ của tháng đó.';

-- ---------------------------------------------------------------------
-- 7. QUỸ THÁNG CỦA TỪNG THÀNH VIÊN
-- ---------------------------------------------------------------------
create table if not exists public.member_fees (
  id           uuid             primary key default gen_random_uuid(),
  period_id    uuid             not null references public.fee_periods(id) on delete cascade,
  member_id    uuid             not null references public.members(id) on delete cascade,
  amount       numeric(12,2)    not null check (amount >= 0),
  status       public.fee_status not null default 'unpaid',
  paid_at      timestamptz,
  paid_method  text,
  collected_by uuid references public.members(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint member_fees_unique unique (period_id, member_id),
  constraint member_fees_paid_has_time check (status <> 'paid' or paid_at is not null)
);

create index if not exists idx_member_fees_member on public.member_fees (member_id);
create index if not exists idx_member_fees_status on public.member_fees (status);

drop trigger if exists trg_member_fees_updated_at on public.member_fees;
create trigger trg_member_fees_updated_at
  before update on public.member_fees
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 8. SỔ QUỸ CLB
--    amount dương = thu, âm = chi. Số dư = tổng amount (bỏ dòng đã xóa mềm).
-- ---------------------------------------------------------------------
create table if not exists public.fund_entries (
  id            uuid                  primary key default gen_random_uuid(),
  entry_date    date                  not null default current_date,
  entry_type    public.fund_entry_type not null,
  amount        numeric(12,2)         not null check (amount <> 0),
  description   text                  not null,
  session_id    uuid references public.sessions(id)    on delete set null,
  member_fee_id uuid references public.member_fees(id) on delete set null,
  member_id     uuid references public.members(id)     on delete set null,
  created_by    uuid references public.members(id)     on delete set null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.members(id)     on delete set null,
  constraint fund_entries_sign check (
    (entry_type in ('monthly_fee', 'guest_fee', 'other_income') and amount > 0)
    or (entry_type in ('session_expense', 'other_expense') and amount < 0)
    or (entry_type = 'adjustment')
  )
);

comment on table public.fund_entries is 'Sổ quỹ CLB. Xóa mềm bằng deleted_at để số dư tự tính lại.';

create index if not exists idx_fund_entries_date    on public.fund_entries (entry_date desc);
create index if not exists idx_fund_entries_session on public.fund_entries (session_id);
create index if not exists idx_fund_entries_live    on public.fund_entries (entry_date desc) where deleted_at is null;

-- Mỗi khoản quỹ tháng chỉ được ghi sổ một lần
create unique index if not exists uq_fund_entries_member_fee
  on public.fund_entries (member_fee_id)
  where member_fee_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------
-- 9. NHẬT KÝ HOẠT ĐỘNG (cho card "Hoạt động gần đây")
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id          uuid        primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_id    uuid references public.members(id) on delete set null,
  action      text        not null,
  entity_type text,
  entity_id   uuid,
  description text        not null,
  meta        jsonb       not null default '{}'::jsonb
);

create index if not exists idx_activity_log_time on public.activity_log (occurred_at desc);

-- Dòng cấu hình mặc định
insert into public.club_settings (id) values (1) on conflict (id) do nothing;
