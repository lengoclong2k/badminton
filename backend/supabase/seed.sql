-- =====================================================================
-- SEED — dữ liệu mẫu khớp với màn hình trong frontend (tháng 8/2026)
-- Chạy bằng: supabase db reset  (hoặc psql -f seed.sql)
-- Số dư quỹ sau khi seed = 5.020.000 ₫
-- =====================================================================

begin;

-- 1. Cấu hình CLB ------------------------------------------------------
update public.club_settings set
  club_name          = 'CLB Cầu Lông HDA',
  default_court      = 'Sân Cầu Lông Thành Công',
  monthly_fee_male   = 400000,
  monthly_fee_female = 280000,
  guest_fee_male     = 70000,
  guest_fee_female   = 49000,
  female_ratio       = 0.7,
  onboarding_done    = true
where id = 1;

-- 2. Lịch cố định: Thứ Ba (2) & Thứ Năm (4), 19h–21h -------------------
insert into public.fixed_schedules (weekday, start_time, end_time, court)
values (2, '19:00', '21:00', 'Sân Cầu Lông Thành Công'),
       (4, '19:00', '21:00', 'Sân Cầu Lông Thành Công')
on conflict (weekday, start_time) do nothing;

-- 3. Thành viên: 9 nam + 7 nữ -----------------------------------------
insert into public.members (full_name, sex, role, phone, email, joined_at) values
  ('Lê Quang Duy',      'nam', 'admin',  '0901000001', 'admin@gmail.com', '2025-01-05'),
  ('Phạm Văn Khoa',     'nam', 'member', '0901000002', null, '2025-01-05'),
  ('Bùi Ngọc Nam',      'nam', 'member', '0901000003', null, '2025-02-10'),
  ('Đỗ Minh Quân',      'nam', 'member', '0901000004', null, '2025-02-10'),
  ('Vũ Đức Thắng',      'nam', 'member', '0901000005', null, '2025-03-01'),
  ('Trần Hoàng Long',   'nam', 'member', '0901000006', null, '2025-03-01'),
  ('Nguyễn Anh Tú',     'nam', 'member', '0901000007', null, '2025-04-12'),
  ('Lý Gia Bảo',        'nam', 'member', '0901000008', null, '2025-05-20'),
  ('Hồ Xuân Trường',    'nam', 'member', '0901000009', null, '2025-06-02'),
  ('Trần Thu Hà',       'nu',  'member', '0902000001', null, '2025-01-05'),
  ('Hoàng Mai Anh',     'nu',  'member', '0902000002', null, '2025-02-10'),
  ('Nguyễn Thị Linh',   'nu',  'member', '0902000003', null, '2025-02-10'),
  ('Phạm Ngọc Bích',    'nu',  'member', '0902000004', null, '2025-03-15'),
  ('Đặng Thùy Dương',   'nu',  'member', '0902000005', null, '2025-04-01'),
  ('Lê Kim Chi',        'nu',  'member', '0902000006', null, '2025-05-05'),
  ('Vũ Hà My',          'nu',  'member', '0902000007', null, '2025-06-18')
on conflict do nothing;

-- 4. Buổi đánh tháng 8/2026 -------------------------------------------
--    8 buổi đã chốt (mỗi buổi chi 560.000 ₫), 2 buổi sắp tới, 1 buổi nháp
insert into public.sessions
  (play_date, start_time, end_time, court, session_type, status,
   guest_slots_enabled, guest_slots_max, guest_fee_male, guest_fee_female,
   court_cost, shuttle_cost, closed_at)
values
  ('2026-08-04','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-04 21:30+07'),
  ('2026-08-06','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-06 21:30+07'),
  ('2026-08-11','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-11 21:30+07'),
  ('2026-08-13','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-13 21:30+07'),
  ('2026-08-15','08:00','10:00','Sân Cầu Lông Thành Công','extra','closed', true, 4, 70000,49000, 420000,140000, '2026-08-15 10:30+07'),
  ('2026-08-18','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-18 21:30+07'),
  ('2026-08-20','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-20 21:30+07'),
  ('2026-08-25','19:00','21:00','Sân Cầu Lông Thành Công','fixed','closed', true, 2, 70000,49000, 420000,140000, '2026-08-25 21:30+07'),
  ('2026-08-27','19:00','21:00','Sân Cầu Lông Thành Công','fixed','open',  false, 0, 70000,49000, 0,0, null),
  ('2026-08-29','08:00','10:00','Sân Cầu Lông Thành Công','extra','open',  true, 4, 70000,49000, 0,0, null),
  ('2026-09-01','19:00','21:00','Sân Cầu Lông Thành Công','fixed','draft', false, 0, 70000,49000, 0,0, null)
on conflict (play_date, start_time) do nothing;

-- 5. Kỳ quỹ tháng 8 + quỹ từng người ----------------------------------
insert into public.fee_periods (period_month, fee_male, fee_female, due_date)
values ('2026-08-01', 400000, 280000, '2026-08-05')
on conflict (period_month) do nothing;

insert into public.member_fees (period_id, member_id, amount, status, paid_at)
select p.id,
       m.id,
       case when m.sex = 'nam' then p.fee_male else p.fee_female end,
       case when m.full_name in ('Bùi Ngọc Nam', 'Hoàng Mai Anh') then 'unpaid'::public.fee_status
            else 'paid'::public.fee_status end,
       case when m.full_name in ('Bùi Ngọc Nam', 'Hoàng Mai Anh') then null
            else timestamptz '2026-08-20 09:00+07' end
from public.fee_periods p
cross join public.members m
where p.period_month = '2026-08-01' and m.status = 'active'
on conflict (period_id, member_id) do nothing;

-- 6. Đăng ký & điểm danh ----------------------------------------------
--    Mỗi thành viên có "số buổi đi" mục tiêu -> đánh dấu present cho
--    N buổi đã chốt đầu tiên, absent cho phần còn lại.
do $seed$
declare
  r_member record;
  r_session record;
  v_idx int;
begin
  for r_member in
    select m.id, m.full_name,
           coalesce(t.target, 5) as target
    from public.members m
    left join (values
      ('Lê Quang Duy', 8), ('Phạm Văn Khoa', 7), ('Nguyễn Thị Linh', 7),
      ('Trần Thu Hà', 6),  ('Bùi Ngọc Nam', 2),  ('Hoàng Mai Anh', 3),
      ('Đỗ Minh Quân', 6), ('Vũ Đức Thắng', 5),  ('Trần Hoàng Long', 4),
      ('Nguyễn Anh Tú', 5),('Lý Gia Bảo', 4),    ('Hồ Xuân Trường', 3),
      ('Phạm Ngọc Bích',5),('Đặng Thùy Dương',4),('Lê Kim Chi', 4),
      ('Vũ Hà My', 3)
    ) as t(name, target) on t.name = m.full_name
    where m.status = 'active'
  loop
    v_idx := 0;
    for r_session in
      select id from public.sessions
      where status = 'closed' and play_date >= '2026-08-01'
      order by play_date
    loop
      v_idx := v_idx + 1;
      insert into public.session_attendees (session_id, member_id, rsvp_status, attendance, checked_at)
      values (
        r_session.id, r_member.id, 'registered',
        case when v_idx <= r_member.target then 'present'::public.attendance_status
             else 'absent'::public.attendance_status end,
        timestamptz '2026-08-27 21:30+07'
      )
      on conflict do nothing;
    end loop;
  end loop;

  -- Buổi 27/08 đang mở: 9 nam + 5 nữ đã đăng ký
  insert into public.session_attendees (session_id, member_id)
  select s.id, m.id
  from public.sessions s
  cross join lateral (
    (select id, sex from public.members where sex = 'nam' and status = 'active' order by full_name limit 9)
    union all
    (select id, sex from public.members where sex = 'nu'  and status = 'active' order by full_name limit 5)
  ) m
  where s.play_date = '2026-08-27'
  on conflict do nothing;

  -- Buổi 29/08 (phát sinh): 6 nam + 4 nữ
  insert into public.session_attendees (session_id, member_id)
  select s.id, m.id
  from public.sessions s
  cross join lateral (
    (select id from public.members where sex = 'nam' and status = 'active' order by full_name limit 6)
    union all
    (select id from public.members where sex = 'nu'  and status = 'active' order by full_name limit 4)
  ) m
  where s.play_date = '2026-08-29'
  on conflict do nothing;
end
$seed$;

-- 7. Khách trong các buổi đã chốt: 9 khách nam + 3 khách nữ = 777.000 ₫
insert into public.session_attendees (session_id, guest_name, guest_sex, guest_fee, guest_paid, attendance)
select s.id, g.name, g.sex, g.fee, true, 'present'
from public.sessions s
join (values
  ('2026-08-04'::date, 'Khách: Anh Tuấn',  'nam'::public.sex, 70000),
  ('2026-08-04'::date, 'Khách: Chị Lan',   'nu'::public.sex,  49000),
  ('2026-08-06'::date, 'Khách: Anh Sơn',   'nam'::public.sex, 70000),
  ('2026-08-11'::date, 'Khách: Anh Hải',   'nam'::public.sex, 70000),
  ('2026-08-13'::date, 'Khách: Anh Đạt',   'nam'::public.sex, 70000),
  ('2026-08-13'::date, 'Khách: Chị Ngân',  'nu'::public.sex,  49000),
  ('2026-08-15'::date, 'Khách: Anh Phúc',  'nam'::public.sex, 70000),
  ('2026-08-15'::date, 'Khách: Anh Hưng',  'nam'::public.sex, 70000),
  ('2026-08-18'::date, 'Khách: Anh Kiên',  'nam'::public.sex, 70000),
  ('2026-08-20'::date, 'Khách: Chị Trâm',  'nu'::public.sex,  49000),
  ('2026-08-25'::date, 'Khách: Anh Bình',  'nam'::public.sex, 70000),
  ('2026-08-25'::date, 'Khách: Anh Vinh',  'nam'::public.sex, 70000)
) as g(play_date, name, sex, fee) on g.play_date = s.play_date;

-- 8. Sổ quỹ ------------------------------------------------------------
-- 8a. Số dư đầu kỳ 01/08
insert into public.fund_entries (entry_date, entry_type, amount, description)
values ('2026-08-01', 'adjustment', 3843000, 'Số dư quỹ chuyển sang từ tháng 7');

-- 8b. Thu quỹ tháng 8 (14 người đã đóng)
insert into public.fund_entries (entry_date, entry_type, amount, description, member_id, member_fee_id)
select '2026-08-20', 'monthly_fee', mf.amount,
       'Thu quỹ tháng 08/2026 · ' || m.full_name,
       m.id, mf.id
from public.member_fees mf
join public.members m on m.id = mf.member_id
join public.fee_periods p on p.id = mf.period_id
where p.period_month = '2026-08-01' and mf.status = 'paid';

-- 8c. Chi phí từng buổi đã chốt
insert into public.fund_entries (entry_date, entry_type, amount, description, session_id)
select s.play_date, 'session_expense', -s.total_cost,
       'Chi buổi ' || to_char(s.play_date, 'DD/MM') || ' · sân + cầu', s.id
from public.sessions s
where s.status = 'closed' and s.total_cost > 0;

-- 8d. Thu khách từng buổi
insert into public.fund_entries (entry_date, entry_type, amount, description, session_id)
select s.play_date, 'guest_fee', sum(a.guest_fee),
       'Thu khách buổi ' || to_char(s.play_date, 'DD/MM'), s.id
from public.sessions s
join public.session_attendees a on a.session_id = s.id
where s.status = 'closed' and a.member_id is null and a.guest_paid
group by s.id, s.play_date;

-- 9. Nhật ký hoạt động -------------------------------------------------
insert into public.activity_log (occurred_at, action, description, entity_type)
values
  ('2026-08-25 21:35+07', 'session.close', '25/08 · Chốt buổi — Chi 560.000 ₫ · Thu khách 140.000 ₫', 'session'),
  ('2026-08-20 09:05+07', 'fee.collect',   '20/08 · Thu quỹ tháng 8 (14 người) 4.880.000 ₫', 'member_fee'),
  ('2026-08-18 21:35+07', 'session.close', '18/08 · Chốt buổi — Chi 560.000 ₫', 'session');

commit;

-- Kiểm tra nhanh:
--   select * from public.v_fund_balance;                 -> 5.020.000
--   select * from public.v_leaderboard order by rank;    -> bảng xếp hạng T8
--   select * from public.v_session_summary order by play_date;
