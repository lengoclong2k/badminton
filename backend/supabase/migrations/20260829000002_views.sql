-- =====================================================================
-- VIEWS — số liệu cho các màn hình trong UI
-- =====================================================================

-- Số dư quỹ CLB (StatCard "Quỹ CLB hiện có")
create or replace view public.v_fund_balance with (security_invoker = true) as
select
  coalesce(sum(amount), 0)::numeric(14,2)                                as balance,
  coalesce(sum(amount) filter (where amount > 0), 0)::numeric(14,2)      as total_in,
  coalesce(sum(-amount) filter (where amount < 0), 0)::numeric(14,2)     as total_out,
  max(entry_date)                                                        as last_entry_date
from public.fund_entries
where deleted_at is null;

-- Sổ quỹ hiển thị (đã lọc dòng xóa mềm, kèm tên người/buổi liên quan)
create or replace view public.v_fund_ledger with (security_invoker = true) as
select
  f.id,
  f.entry_date,
  f.entry_type,
  f.amount,
  f.description,
  f.session_id,
  s.slug        as session_slug,
  f.member_id,
  m.full_name   as member_name,
  f.created_at,
  sum(f.amount) over (order by f.entry_date, f.created_at, f.id)::numeric(14,2) as running_balance
from public.fund_entries f
left join public.sessions s on s.id = f.session_id
left join public.members  m on m.id = f.member_id
where f.deleted_at is null;

-- Thống kê từng buổi: số đăng ký nam/nữ, khách, thu/chi
create or replace view public.v_session_summary with (security_invoker = true) as
select
  s.id,
  s.slug,
  s.play_date,
  s.start_time,
  s.end_time,
  s.court,
  s.session_type,
  s.status,
  s.guest_slots_enabled,
  s.guest_slots_max,
  s.total_cost,
  a.member_count,
  a.male_count,
  a.female_count,
  a.guest_count,
  a.guest_male_count,
  a.guest_female_count,
  a.present_count,
  a.absent_count,
  a.guest_income,
  greatest(s.guest_slots_max - a.guest_count, 0) as guest_slots_left,
  (a.guest_income - s.total_cost)::numeric(14,2) as fund_delta
from public.sessions s
cross join lateral (
  select
    count(*) filter (where sa.member_id is not null and sa.rsvp_status = 'registered')                       as member_count,
    count(*) filter (where sa.member_id is not null and sa.rsvp_status = 'registered' and mm.sex = 'nam')    as male_count,
    count(*) filter (where sa.member_id is not null and sa.rsvp_status = 'registered' and mm.sex = 'nu')     as female_count,
    count(*) filter (where sa.member_id is null and sa.rsvp_status = 'registered')                           as guest_count,
    count(*) filter (where sa.member_id is null and sa.rsvp_status = 'registered' and sa.guest_sex = 'nam')  as guest_male_count,
    count(*) filter (where sa.member_id is null and sa.rsvp_status = 'registered' and sa.guest_sex = 'nu')   as guest_female_count,
    count(*) filter (where sa.attendance = 'present')                                                        as present_count,
    count(*) filter (where sa.attendance = 'absent')                                                         as absent_count,
    coalesce(sum(sa.guest_fee) filter (where sa.member_id is null and sa.rsvp_status = 'registered' and sa.guest_paid), 0)::numeric(14,2) as guest_income
  from public.session_attendees sa
  left join public.members mm on mm.id = sa.member_id
  where sa.session_id = s.id
) a;

-- Danh sách người trong một buổi (màn Điểm danh)
create or replace view public.v_session_attendees with (security_invoker = true) as
select
  sa.id,
  sa.session_id,
  s.slug            as session_slug,
  sa.member_id,
  coalesce(m.full_name, sa.guest_name) as display_name,
  coalesce(m.sex, sa.guest_sex)        as sex,
  sa.is_guest,
  sa.rsvp_status,
  sa.attendance,
  sa.guest_fee,
  sa.guest_paid,
  sa.registered_at,
  -- Đã đóng quỹ tháng của tháng diễn ra buổi hay chưa
  mf.status                            as month_fee_status
from public.session_attendees sa
join public.sessions s on s.id = sa.session_id
left join public.members m on m.id = sa.member_id
left join public.fee_periods fp on fp.period_month = date_trunc('month', s.play_date)::date
left join public.member_fees mf on mf.period_id = fp.id and mf.member_id = sa.member_id;

-- Quỹ + số buổi đã đi của từng thành viên theo từng tháng
create or replace view public.v_member_month_stats with (security_invoker = true) as
select
  fp.period_month,
  m.id        as member_id,
  m.slug      as member_slug,
  m.full_name,
  m.sex,
  mf.id       as member_fee_id,
  mf.amount   as fee_amount,
  mf.status   as fee_status,
  att.sessions_registered,
  att.sessions_attended,
  att.sessions_missed,
  -- Giá thực mỗi buổi = quỹ tháng ÷ số buổi đã đi. Thấp hơn = đi đều hơn.
  case
    when att.sessions_attended > 0 then round(mf.amount / att.sessions_attended)
    else null
  end::numeric(12,2) as cost_per_session
from public.fee_periods fp
join public.member_fees mf on mf.period_id = fp.id
join public.members m      on m.id = mf.member_id
cross join lateral (
  select
    count(*) filter (where sa.rsvp_status = 'registered')  as sessions_registered,
    count(*) filter (where sa.attendance = 'present')      as sessions_attended,
    count(*) filter (where sa.attendance = 'absent')       as sessions_missed
  from public.session_attendees sa
  join public.sessions s on s.id = sa.session_id
  where sa.member_id = m.id
    and s.status <> 'cancelled'
    and date_trunc('month', s.play_date)::date = fp.period_month
) att;

-- Bảng xếp hạng "ai lời nhất tháng" — giá thực mỗi buổi càng thấp càng tốt
create or replace view public.v_leaderboard with (security_invoker = true) as
select
  s.*,
  rank() over (
    partition by s.period_month
    order by s.cost_per_session asc nulls last
  ) as rank
from public.v_member_month_stats s;

-- Tình trạng quỹ tháng hiện tại của mỗi thành viên (màn Thành viên)
create or replace view public.v_member_current_fee with (security_invoker = true) as
select
  m.id        as member_id,
  m.slug,
  m.full_name,
  m.sex,
  m.status,
  fp.period_month,
  mf.id       as member_fee_id,
  mf.amount,
  mf.status   as fee_status,
  mf.paid_at
from public.members m
left join public.fee_periods fp on fp.period_month = date_trunc('month', current_date)::date
left join public.member_fees mf on mf.period_id = fp.id and mf.member_id = m.id;

-- Tổng quan tháng cho dashboard admin
create or replace view public.v_month_overview with (security_invoker = true) as
select
  fp.period_month,
  count(mf.*)                                                            as member_count,
  count(mf.*) filter (where mf.status = 'paid')                          as paid_count,
  count(mf.*) filter (where mf.status = 'unpaid')                        as unpaid_count,
  coalesce(sum(mf.amount) filter (where mf.status = 'paid'), 0)          as collected_amount,
  coalesce(sum(mf.amount) filter (where mf.status = 'unpaid'), 0)        as outstanding_amount
from public.fee_periods fp
left join public.member_fees mf on mf.period_id = fp.id
group by fp.period_month;
