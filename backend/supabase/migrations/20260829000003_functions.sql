-- =====================================================================
-- FUNCTIONS — nghiệp vụ chính
-- =====================================================================

-- ---------------------------------------------------------------------
-- Danh tính
-- ---------------------------------------------------------------------
create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id from public.members m where m.user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
  );
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ chủ nhiệm CLB mới được thực hiện thao tác này' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Bảo vệ cột nhạy cảm: member tự sửa được phone/avatar, KHÔNG sửa được
-- giới tính, vai trò, trạng thái (vì các cột này quyết định mức quỹ).
-- ---------------------------------------------------------------------
create or replace function public.members_guard_protected_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Không có phiên người dùng (service_role, trigger hệ thống, seed) -> bỏ qua
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  -- Cho phép gắn tài khoản lần đầu vào một dòng chưa có user_id
  if old.user_id is null and new.user_id is not null
     and new.sex is not distinct from old.sex
     and new.role is not distinct from old.role
     and new.status is not distinct from old.status then
    return new;
  end if;
  if new.sex     is distinct from old.sex
     or new.role   is distinct from old.role
     or new.status is distinct from old.status
     or new.user_id is distinct from old.user_id
     or new.joined_at is distinct from old.joined_at then
    raise exception 'Chỉ chủ nhiệm mới được sửa giới tính, vai trò hoặc trạng thái thành viên'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists trg_members_guard on public.members;
create trigger trg_members_guard
  before update on public.members
  for each row execute function public.members_guard_protected_columns();

-- ---------------------------------------------------------------------
-- Ghi nhật ký
-- ---------------------------------------------------------------------
create or replace function public.log_activity(
  p_action text,
  p_description text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.activity_log (actor_id, action, description, entity_type, entity_id, meta)
  values (public.current_member_id(), p_action, p_description, p_entity_type, p_entity_id, p_meta)
  returning id;
$$;

-- ---------------------------------------------------------------------
-- Mở kỳ quỹ tháng: tạo fee_periods + member_fees cho mọi thành viên active
-- ---------------------------------------------------------------------
create or replace function public.open_fee_period(p_month date default current_date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month  date := date_trunc('month', p_month)::date;
  v_cfg    public.club_settings;
  v_period public.fee_periods;
begin
  perform public.require_admin();
  select * into v_cfg from public.club_settings where id = 1;

  insert into public.fee_periods (period_month, fee_male, fee_female, due_date)
  values (v_month, v_cfg.monthly_fee_male, v_cfg.monthly_fee_female,
          v_month + (v_cfg.fee_due_day - 1))
  on conflict (period_month) do update set period_month = excluded.period_month
  returning * into v_period;

  insert into public.member_fees (period_id, member_id, amount)
  select v_period.id,
         m.id,
         case when m.sex = 'nam' then v_period.fee_male else v_period.fee_female end
  from public.members m
  where m.status = 'active'
  on conflict (period_id, member_id) do nothing;

  perform public.log_activity(
    'fee_period.open',
    'Mở kỳ quỹ tháng ' || to_char(v_month, 'MM/YYYY'),
    'fee_period', v_period.id
  );

  return v_period.id;
end $$;

-- ---------------------------------------------------------------------
-- Thu quỹ: đánh dấu đã đóng + ghi sổ quỹ (nút "Xác nhận đã thu")
-- ---------------------------------------------------------------------
create or replace function public.pay_member_fees(
  p_fee_ids uuid[],
  p_paid_on date default current_date,
  p_method  text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_total numeric(12,2) := 0;
  r       record;
begin
  perform public.require_admin();
  v_admin := public.current_member_id();

  for r in
    select mf.id, mf.amount, mf.member_id, m.full_name, fp.period_month
    from public.member_fees mf
    join public.members m      on m.id = mf.member_id
    join public.fee_periods fp on fp.id = mf.period_id
    where mf.id = any(p_fee_ids)
      and mf.status <> 'paid'
    for update of mf
  loop
    update public.member_fees
      set status = 'paid', paid_at = now(), paid_method = p_method, collected_by = v_admin
      where id = r.id;

    insert into public.fund_entries
      (entry_date, entry_type, amount, description, member_id, member_fee_id, created_by)
    values
      (p_paid_on, 'monthly_fee', r.amount,
       'Thu quỹ tháng ' || to_char(r.period_month, 'MM/YYYY') || ' · ' || r.full_name,
       r.member_id, r.id, v_admin);

    v_total := v_total + r.amount;
  end loop;

  if v_total > 0 then
    perform public.log_activity(
      'fee.collect',
      'Thu quỹ ' || to_char(v_total, 'FM999G999G999') || ' đ',
      'member_fee', null,
      jsonb_build_object('fee_ids', to_jsonb(p_fee_ids), 'total', v_total)
    );
  end if;

  return v_total;
end $$;

create or replace function public.unpay_member_fee(p_fee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid;
begin
  perform public.require_admin();
  v_admin := public.current_member_id();

  update public.fund_entries
    set deleted_at = now(), deleted_by = v_admin
    where member_fee_id = p_fee_id and deleted_at is null;

  update public.member_fees
    set status = 'unpaid', paid_at = null, paid_method = null, collected_by = null
    where id = p_fee_id;
end $$;

-- ---------------------------------------------------------------------
-- Sinh buổi cố định từ lịch hàng tuần
-- ---------------------------------------------------------------------
create or replace function public.generate_fixed_sessions(
  p_from date default current_date,
  p_to   date default (current_date + 28)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg   public.club_settings;
  v_count int := 0;
  r       record;
begin
  perform public.require_admin();
  select * into v_cfg from public.club_settings where id = 1;

  for r in
    select fs.id, fs.weekday, fs.start_time, fs.end_time, fs.court, d::date as play_date
    from public.fixed_schedules fs
    cross join generate_series(p_from, p_to, interval '1 day') d
    where fs.is_active
      and extract(dow from d) = fs.weekday
  loop
    insert into public.sessions (
      play_date, start_time, end_time, court, session_type, status,
      fixed_schedule_id, guest_fee_male, guest_fee_female, created_by
    )
    values (
      r.play_date, r.start_time, r.end_time, coalesce(r.court, v_cfg.default_court),
      'fixed', 'draft', r.id, v_cfg.guest_fee_male, v_cfg.guest_fee_female,
      public.current_member_id()
    )
    on conflict (play_date, start_time) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Chốt buổi: ghi chi phí + thu khách vào sổ quỹ, khóa buổi lại
-- ---------------------------------------------------------------------
create or replace function public.close_session(
  p_session_id   uuid,
  p_court_cost   numeric default null,
  p_shuttle_cost numeric default null,
  p_other_cost   numeric default null,
  p_pending_as   public.attendance_status default 'present'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin        uuid;
  v_session      public.sessions;
  v_total_cost   numeric(12,2);
  v_guest_income numeric(12,2);
begin
  perform public.require_admin();
  v_admin := public.current_member_id();

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'Không tìm thấy buổi đánh' using errcode = 'P0002';
  end if;
  if v_session.status = 'closed' then
    raise exception 'Buổi này đã được chốt' using errcode = '55000';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'Buổi này đã bị hủy, không thể chốt' using errcode = '55000';
  end if;

  update public.sessions
    set court_cost   = coalesce(p_court_cost,   court_cost),
        shuttle_cost = coalesce(p_shuttle_cost, shuttle_cost),
        other_cost   = coalesce(p_other_cost,   other_cost),
        status       = 'closed',
        closed_at    = now()
    where id = p_session_id
    returning * into v_session;

  -- Người đăng ký chưa điểm danh -> mặc định theo tham số
  update public.session_attendees
    set attendance = p_pending_as, checked_at = now()
    where session_id = p_session_id
      and rsvp_status = 'registered'
      and attendance = 'pending';

  v_total_cost := v_session.total_cost;

  select coalesce(sum(guest_fee), 0)::numeric(12,2)
    into v_guest_income
    from public.session_attendees
    where session_id = p_session_id
      and member_id is null
      and rsvp_status = 'registered'
      and guest_paid;

  if v_total_cost > 0 then
    insert into public.fund_entries
      (entry_date, entry_type, amount, description, session_id, created_by)
    values
      (v_session.play_date, 'session_expense', -v_total_cost,
       'Chi buổi ' || to_char(v_session.play_date, 'DD/MM') || ' · sân + cầu',
       p_session_id, v_admin);
  end if;

  if v_guest_income > 0 then
    insert into public.fund_entries
      (entry_date, entry_type, amount, description, session_id, created_by)
    values
      (v_session.play_date, 'guest_fee', v_guest_income,
       'Thu khách buổi ' || to_char(v_session.play_date, 'DD/MM'),
       p_session_id, v_admin);
  end if;

  perform public.log_activity(
    'session.close',
    to_char(v_session.play_date, 'DD/MM') || ' · Chốt buổi',
    'session', p_session_id,
    jsonb_build_object('cost', v_total_cost, 'guest_income', v_guest_income,
                       'fund_delta', v_guest_income - v_total_cost)
  );

  return jsonb_build_object(
    'session_id', p_session_id,
    'total_cost', v_total_cost,
    'guest_income', v_guest_income,
    'fund_delta', v_guest_income - v_total_cost,
    'balance_after', (select balance from public.v_fund_balance)
  );
end $$;

-- Mở lại buổi đã chốt (hoàn tác): gỡ các dòng sổ quỹ của buổi đó
create or replace function public.reopen_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_admin uuid;
begin
  perform public.require_admin();
  v_admin := public.current_member_id();

  update public.fund_entries
    set deleted_at = now(), deleted_by = v_admin
    where session_id = p_session_id
      and entry_type in ('session_expense', 'guest_fee')
      and deleted_at is null;

  update public.sessions
    set status = 'open', closed_at = null
    where id = p_session_id and status = 'closed';
end $$;

-- Hủy buổi
create or replace function public.cancel_session(p_session_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();

  update public.sessions
    set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason
    where id = p_session_id and status <> 'closed';

  if not found then
    raise exception 'Không hủy được: buổi không tồn tại hoặc đã chốt' using errcode = '55000';
  end if;

  update public.session_attendees
    set rsvp_status = 'cancelled'
    where session_id = p_session_id;

  perform public.log_activity('session.cancel', 'Hủy buổi', 'session', p_session_id);
end $$;

-- ---------------------------------------------------------------------
-- RSVP CÔNG KHAI (không cần đăng nhập) — chỉ qua 3 hàm dưới đây.
-- Bảng vẫn đóng với anon; các hàm này là security definer nên kiểm soát
-- được chính xác dữ liệu lộ ra ngoài.
-- ---------------------------------------------------------------------
create or replace function public.rsvp_get_session(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_cfg     public.club_settings;
  v_result  jsonb;
begin
  select * into v_session from public.sessions where slug = p_slug;
  if not found then
    raise exception 'Không tìm thấy buổi đánh' using errcode = 'P0002';
  end if;
  select * into v_cfg from public.club_settings where id = 1;

  select jsonb_build_object(
    'club_name',   v_cfg.club_name,
    'slug',        v_session.slug,
    'play_date',   v_session.play_date,
    'start_time',  v_session.start_time,
    'end_time',    v_session.end_time,
    'court',       v_session.court,
    'session_type', v_session.session_type,
    'status',      v_session.status,
    'is_open',     (v_session.status = 'open'
                    and (v_session.rsvp_closes_at is null or v_session.rsvp_closes_at > now())),
    'guest_slots_enabled', v_session.guest_slots_enabled,
    'guest_slots_max',     v_session.guest_slots_max,
    'guest_slots_left',    (select guest_slots_left from public.v_session_summary where id = v_session.id),
    'guest_fee_male',      v_session.guest_fee_male,
    'guest_fee_female',    v_session.guest_fee_female,
    'members', (
      select coalesce(jsonb_agg(x order by x->>'full_name'), '[]'::jsonb) from (
        select jsonb_build_object(
          'id', m.id,
          'full_name', m.full_name,
          'sex', m.sex,
          'registered', (sa.id is not null and sa.rsvp_status = 'registered')
        ) as x
        from public.members m
        left join public.session_attendees sa
          on sa.member_id = m.id and sa.session_id = v_session.id
        where m.status = 'active'
      ) t
    ),
    'guests', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', sa.id, 'name', sa.guest_name, 'sex', sa.guest_sex, 'fee', sa.guest_fee
      )), '[]'::jsonb)
      from public.session_attendees sa
      where sa.session_id = v_session.id
        and sa.member_id is null
        and sa.rsvp_status = 'registered'
    )
  ) into v_result;

  return v_result;
end $$;

create or replace function public.rsvp_toggle_member(p_slug text, p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_row     public.session_attendees;
begin
  select * into v_session from public.sessions where slug = p_slug for update;
  if not found then
    raise exception 'Không tìm thấy buổi đánh' using errcode = 'P0002';
  end if;
  if v_session.status <> 'open' then
    raise exception 'Buổi này chưa mở hoặc đã đóng đăng ký' using errcode = '55000';
  end if;
  if v_session.rsvp_closes_at is not null and v_session.rsvp_closes_at <= now() then
    raise exception 'Đã hết hạn đăng ký buổi này' using errcode = '55000';
  end if;
  if not exists (select 1 from public.members where id = p_member_id and status = 'active') then
    raise exception 'Thành viên không hợp lệ' using errcode = 'P0002';
  end if;

  select * into v_row
    from public.session_attendees
    where session_id = v_session.id and member_id = p_member_id;

  if not found then
    insert into public.session_attendees (session_id, member_id)
    values (v_session.id, p_member_id)
    returning * into v_row;
  else
    update public.session_attendees
      set rsvp_status = case when rsvp_status = 'registered' then 'cancelled' else 'registered' end,
          registered_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  return jsonb_build_object('member_id', p_member_id, 'rsvp_status', v_row.rsvp_status);
end $$;

create or replace function public.rsvp_add_guest(
  p_slug      text,
  p_guest_name text,
  p_guest_sex  public.sex,
  p_invited_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_used    int;
  v_fee     numeric(12,2);
  v_row     public.session_attendees;
begin
  select * into v_session from public.sessions where slug = p_slug for update;
  if not found then
    raise exception 'Không tìm thấy buổi đánh' using errcode = 'P0002';
  end if;
  if not v_session.guest_slots_enabled or v_session.status <> 'open' then
    raise exception 'Buổi này không mở slot khách' using errcode = '55000';
  end if;

  select count(*) into v_used
    from public.session_attendees
    where session_id = v_session.id and member_id is null and rsvp_status = 'registered';

  if v_used >= v_session.guest_slots_max then
    raise exception 'Đã hết slot khách' using errcode = '55000';
  end if;

  v_fee := case when p_guest_sex = 'nam' then v_session.guest_fee_male else v_session.guest_fee_female end;

  insert into public.session_attendees (session_id, guest_name, guest_sex, guest_fee, invited_by)
  values (v_session.id, btrim(p_guest_name), p_guest_sex, v_fee, p_invited_by)
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'name', v_row.guest_name, 'fee', v_row.guest_fee);
end $$;

-- ---------------------------------------------------------------------
-- Quyền gọi hàm
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public;

grant execute on function
  public.rsvp_get_session(text),
  public.rsvp_toggle_member(text, uuid),
  public.rsvp_add_guest(text, text, public.sex, uuid)
to anon, authenticated;

grant execute on function
  public.current_member_id(),
  public.is_admin(),
  public.open_fee_period(date),
  public.pay_member_fees(uuid[], date, text),
  public.unpay_member_fee(uuid),
  public.generate_fixed_sessions(date, date),
  public.close_session(uuid, numeric, numeric, numeric, public.attendance_status),
  public.reopen_session(uuid),
  public.cancel_session(uuid, text),
  public.log_activity(text, text, text, uuid, jsonb)
to authenticated;
