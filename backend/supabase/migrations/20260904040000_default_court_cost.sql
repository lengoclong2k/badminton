-- ---------------------------------------------------------------------
-- Tiền sân mặc định cho buổi cố định.
--
-- Buổi cố định sinh hàng tuần qua generate_fixed_sessions không nên bắt
-- admin gõ tay tiền sân mỗi lần chốt buổi — vì sân cố định thường có giá
-- không đổi. Thêm cấu hình "default_court_cost" ở club_settings (sửa 1
-- lần trong màn Cài đặt), và dùng giá trị này để điền sẵn court_cost khi
-- sinh buổi cố định. Admin vẫn sửa được số này lúc "Chốt buổi" nếu buổi
-- đó phát sinh chi phí khác giá mặc định.
--
-- Buổi vãng lai (extra) KHÔNG áp dụng mặc định này — vẫn nhập tay như cũ.
-- ---------------------------------------------------------------------

alter table public.club_settings
  add column if not exists default_court_cost numeric(12,2) not null default 0 check (default_court_cost >= 0);

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
      fixed_schedule_id, guest_fee_male, guest_fee_female, court_cost, created_by
    )
    values (
      r.play_date, r.start_time, r.end_time, coalesce(r.court, v_cfg.default_court),
      'fixed', 'draft', r.id, v_cfg.guest_fee_male, v_cfg.guest_fee_female,
      v_cfg.default_court_cost, public.current_member_id()
    )
    on conflict (play_date, start_time) do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;
