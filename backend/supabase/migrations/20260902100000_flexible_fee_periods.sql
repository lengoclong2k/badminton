-- ---------------------------------------------------------------------
-- Bỏ khái niệm "quỹ theo tháng cố định": admin giờ tự tay mở TỪNG ĐỢT thu
-- quỹ bất cứ lúc nào (không giới hạn 1 lần/tháng, cũng không bắt buộc phải
-- mở mỗi tháng). Mỗi lần bấm "Mở đợt thu quỹ" là 1 đợt ĐỘC LẬP, sinh khoản
-- "chưa đóng" cho mọi thành viên đang hoạt động theo mức phí đang cấu hình
-- ở Cài đặt. Nợ các đợt CỘNG DỒN — mở đợt mới không tự xóa nợ đợt cũ.
--
-- period_month vẫn được tự tính (= tháng lúc mở) và GIỮ LẠI chỉ để nhóm
-- theo tháng dương lịch cho bảng xếp hạng thi đua (theo quyết định người
-- dùng: "giá mỗi buổi" trên bảng xếp hạng vẫn tính theo tháng thật của
-- buổi đánh, bất kể tháng đó mở mấy đợt thu quỹ).
-- ---------------------------------------------------------------------

alter table public.fee_periods
  add column if not exists opened_at timestamptz not null default now();

update public.fee_periods set opened_at = period_month::timestamptz where opened_at is null;

alter table public.fee_periods drop constraint if exists fee_periods_month_is_first_day;
alter table public.fee_periods drop constraint if exists fee_periods_period_month_key;

comment on table public.fee_periods is 'Mỗi dòng là 1 đợt thu quỹ do admin tự mở (không cố định theo tháng, không giới hạn số lần/tháng). period_month chỉ dùng để nhóm bảng xếp hạng theo tháng dương lịch.';
comment on column public.fee_periods.period_month is 'Tháng dương lịch lúc mở đợt (tự tính từ opened_at) — không còn là khóa duy nhất, 1 tháng có thể có nhiều đợt hoặc không đợt nào.';

-- Mở 1 đợt thu quỹ mới — không còn nhận tham số tháng, luôn dùng thời điểm
-- hiện tại, luôn tạo 1 dòng fee_periods MỚI (không upsert theo tháng nữa)
-- và sinh khoản "chưa đóng" cho mọi thành viên active theo mức phí đang
-- cấu hình ở club_settings tại thời điểm mở.
drop function if exists public.open_fee_period(date);

create or replace function public.open_fee_period()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg    public.club_settings;
  v_period public.fee_periods;
begin
  perform public.require_admin();
  select * into v_cfg from public.club_settings where id = 1;

  insert into public.fee_periods (period_month, opened_at, fee_male, fee_female, due_date)
  values (
    date_trunc('month', now())::date,
    now(),
    v_cfg.monthly_fee_male,
    v_cfg.monthly_fee_female,
    current_date + v_cfg.fee_due_day
  )
  returning * into v_period;

  insert into public.member_fees (period_id, member_id, amount)
  select v_period.id, m.id,
         case when m.sex = 'nam' then v_period.fee_male else v_period.fee_female end
  from public.members m
  where m.status = 'active';

  perform public.log_activity(
    'fee_period.open',
    'Mở đợt thu quỹ ' || to_char(v_period.opened_at, 'DD/MM HH24:MI'),
    'fee_period', v_period.id
  );

  return v_period.id;
end $$;

grant execute on function public.open_fee_period() to authenticated;

-- Xóa các view cũ (có phụ thuộc lẫn nhau) để tạo lại với bộ cột mới —
-- "create or replace view" không cho phép bớt/đổi tên cột nên phải drop.
drop view if exists public.v_leaderboard cascade;
drop view if exists public.v_member_month_stats cascade;
drop view if exists public.v_member_current_fee cascade;
drop view if exists public.v_month_overview cascade;
drop view if exists public.v_session_attendees cascade;

-- Danh sách người trong một buổi (màn Điểm danh) — bỏ cột month_fee_status
-- (không nơi nào dùng, và giờ join theo tháng có thể ra NHIỀU dòng nếu 1
-- tháng có nhiều đợt quỹ -> nhân bản dòng người tham gia buổi).
create view public.v_session_attendees with (security_invoker = true) as
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
  sa.registered_at
from public.session_attendees sa
join public.sessions s on s.id = sa.session_id
left join public.members m on m.id = sa.member_id;

-- Quỹ + số buổi đã đi của từng thành viên theo từng tháng — gộp TẤT CẢ đợt
-- quỹ mở trong CÙNG 1 tháng dương lịch của 1 thành viên thành 1 dòng (cộng
-- dồn số tiền), giữ nguyên ý nghĩa cột cho bảng xếp hạng dù 1 tháng có bao
-- nhiêu đợt thu.
create view public.v_member_month_stats with (security_invoker = true) as
select
  grp.period_month,
  m.id        as member_id,
  m.slug      as member_slug,
  m.full_name,
  m.sex,
  grp.fee_amount,
  att.sessions_registered,
  att.sessions_attended,
  att.sessions_missed,
  case
    when att.sessions_attended > 0 then round(grp.fee_amount / att.sessions_attended)
    else null
  end::numeric(12,2) as cost_per_session
from public.members m
join lateral (
  select
    date_trunc('month', fp.opened_at)::date as period_month,
    sum(mf.amount)                          as fee_amount
  from public.member_fees mf
  join public.fee_periods fp on fp.id = mf.period_id
  where mf.member_id = m.id
  group by date_trunc('month', fp.opened_at)::date
) grp on true
cross join lateral (
  select
    count(*) filter (where sa.rsvp_status = 'registered') as sessions_registered,
    count(*) filter (where sa.rsvp_status = 'registered') as sessions_attended,
    count(*) filter (where sa.rsvp_status = 'cancelled')  as sessions_missed
  from public.session_attendees sa
  join public.sessions s on s.id = sa.session_id
  where sa.member_id = m.id
    and s.status <> 'cancelled'
    and date_trunc('month', s.play_date)::date = grp.period_month
) att;

create view public.v_leaderboard with (security_invoker = true) as
select
  s.*,
  rank() over (
    partition by s.period_month
    order by s.cost_per_session asc nulls last
  ) as rank
from public.v_member_month_stats s;

-- Tổng nợ quỹ CỘNG DỒN tính tới hiện tại của mỗi thành viên (màn Thành
-- viên) — đúng với quyết định "mỗi đợt độc lập, cộng dồn nợ", không còn
-- khái niệm 1 tháng = 1 dòng duy nhất.
create view public.v_member_current_fee with (security_invoker = true) as
select
  m.id        as member_id,
  m.slug,
  m.full_name,
  m.sex,
  m.status,
  agg.unpaid_count,
  agg.unpaid_amount,
  agg.last_opened_at
from public.members m
left join lateral (
  select
    count(*)   filter (where mf.status = 'unpaid')                    as unpaid_count,
    coalesce(sum(mf.amount) filter (where mf.status = 'unpaid'), 0)    as unpaid_amount,
    max(fp.opened_at)                                                  as last_opened_at
  from public.member_fees mf
  join public.fee_periods fp on fp.id = mf.period_id
  where mf.member_id = m.id
) agg on true;

-- Tổng quan quỹ cho dashboard admin — KHÔNG còn khoanh theo tháng, mà là
-- tổng số đang treo trên toàn bộ các đợt (đã đóng / chưa đóng / còn thiếu).
create view public.v_fee_overview with (security_invoker = true) as
select
  count(*)   filter (where mf.status = 'paid')                       as paid_count,
  count(*)   filter (where mf.status = 'unpaid')                     as unpaid_count,
  coalesce(sum(mf.amount) filter (where mf.status = 'paid'), 0)      as collected_amount,
  coalesce(sum(mf.amount) filter (where mf.status = 'unpaid'), 0)    as outstanding_amount,
  (select max(opened_at) from public.fee_periods)                    as last_opened_at
from public.member_fees mf;

grant select on
  public.v_session_attendees, public.v_member_month_stats, public.v_leaderboard,
  public.v_member_current_fee, public.v_fee_overview
to authenticated;
