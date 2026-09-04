-- =====================================================================
-- ROW LEVEL SECURITY
-- Nguyên tắc:
--   • anon (khách vào link RSVP): KHÔNG đọc/ghi bảng trực tiếp,
--     chỉ đi qua 3 hàm rsvp_* (security definer).
--   • authenticated + có dòng members.role = 'member': đọc dữ liệu CLB,
--     tự sửa hồ sơ của mình, tự đăng ký/hủy buổi của mình.
--   • authenticated + role = 'admin': toàn quyền.
-- =====================================================================

alter table public.club_settings    enable row level security;
alter table public.members          enable row level security;
alter table public.fixed_schedules  enable row level security;
alter table public.sessions         enable row level security;
alter table public.session_attendees enable row level security;
alter table public.fee_periods      enable row level security;
alter table public.member_fees      enable row level security;
alter table public.fund_entries     enable row level security;
alter table public.activity_log     enable row level security;

-- ---------------------------------------------------------------------
-- club_settings
-- ---------------------------------------------------------------------
drop policy if exists club_settings_read on public.club_settings;
create policy club_settings_read on public.club_settings
  for select to authenticated using (true);

drop policy if exists club_settings_admin_write on public.club_settings;
create policy club_settings_admin_write on public.club_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- members
-- ---------------------------------------------------------------------
drop policy if exists members_read on public.members;
create policy members_read on public.members
  for select to authenticated using (true);

drop policy if exists members_admin_insert on public.members;
create policy members_admin_insert on public.members
  for insert to authenticated with check (public.is_admin());

drop policy if exists members_admin_delete on public.members;
create policy members_admin_delete on public.members
  for delete to authenticated using (public.is_admin());

-- Admin sửa mọi người; thành viên chỉ sửa dòng của chính mình
-- (trigger members_guard_protected_columns chặn sửa sex/role/status).
drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid());

-- ---------------------------------------------------------------------
-- fixed_schedules
-- ---------------------------------------------------------------------
drop policy if exists fixed_schedules_read on public.fixed_schedules;
create policy fixed_schedules_read on public.fixed_schedules
  for select to authenticated using (true);

drop policy if exists fixed_schedules_admin_write on public.fixed_schedules;
create policy fixed_schedules_admin_write on public.fixed_schedules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions
  for select to authenticated using (true);

drop policy if exists sessions_admin_write on public.sessions;
create policy sessions_admin_write on public.sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- session_attendees
-- ---------------------------------------------------------------------
drop policy if exists session_attendees_read on public.session_attendees;
create policy session_attendees_read on public.session_attendees
  for select to authenticated using (true);

-- Thành viên tự đăng ký cho mình, chỉ khi buổi đang mở
drop policy if exists session_attendees_self_insert on public.session_attendees;
create policy session_attendees_self_insert on public.session_attendees
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      member_id = public.current_member_id()
      and exists (select 1 from public.sessions s where s.id = session_id and s.status = 'open')
    )
  );

drop policy if exists session_attendees_self_update on public.session_attendees;
create policy session_attendees_self_update on public.session_attendees
  for update to authenticated
  using (public.is_admin() or member_id = public.current_member_id())
  with check (public.is_admin() or member_id = public.current_member_id());

drop policy if exists session_attendees_self_delete on public.session_attendees;
create policy session_attendees_self_delete on public.session_attendees
  for delete to authenticated
  using (public.is_admin() or member_id = public.current_member_id());

-- ---------------------------------------------------------------------
-- fee_periods
-- ---------------------------------------------------------------------
drop policy if exists fee_periods_read on public.fee_periods;
create policy fee_periods_read on public.fee_periods
  for select to authenticated using (true);

drop policy if exists fee_periods_admin_write on public.fee_periods;
create policy fee_periods_admin_write on public.fee_periods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- member_fees — công khai trong CLB để bảng xếp hạng và danh sách
-- "chưa đóng quỹ" hiển thị được. Muốn kín hơn thì đổi using thành
-- (public.is_admin() or member_id = public.current_member_id()).
-- ---------------------------------------------------------------------
drop policy if exists member_fees_read on public.member_fees;
create policy member_fees_read on public.member_fees
  for select to authenticated using (true);

drop policy if exists member_fees_admin_write on public.member_fees;
create policy member_fees_admin_write on public.member_fees
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- fund_entries — mọi thành viên xem được sổ quỹ (minh bạch), chỉ admin ghi.
-- ---------------------------------------------------------------------
drop policy if exists fund_entries_read on public.fund_entries;
create policy fund_entries_read on public.fund_entries
  for select to authenticated using (deleted_at is null or public.is_admin());

drop policy if exists fund_entries_admin_write on public.fund_entries;
create policy fund_entries_admin_write on public.fund_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------
drop policy if exists activity_log_read on public.activity_log;
create policy activity_log_read on public.activity_log
  for select to authenticated using (true);

drop policy if exists activity_log_admin_write on public.activity_log;
create policy activity_log_admin_write on public.activity_log
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Quyền cấp bảng: anon không chạm vào bảng nào
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;

grant select on
  public.club_settings, public.members, public.fixed_schedules, public.sessions,
  public.session_attendees, public.fee_periods, public.member_fees,
  public.fund_entries, public.activity_log
to authenticated;

grant insert, update, delete on
  public.club_settings, public.members, public.fixed_schedules, public.sessions,
  public.session_attendees, public.fee_periods, public.member_fees,
  public.fund_entries, public.activity_log
to authenticated;

grant select on
  public.v_fund_balance, public.v_fund_ledger, public.v_session_summary,
  public.v_session_attendees, public.v_member_month_stats, public.v_leaderboard,
  public.v_member_current_fee, public.v_month_overview
to authenticated;

-- ---------------------------------------------------------------------
-- Tự gắn tài khoản mới vào dòng members có sẵn cùng email
-- (admin tạo thành viên trước, thành viên đăng ký sau bằng chính email đó).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
    set user_id = new.id
    where user_id is null
      and email is not null
      and lower(email) = lower(new.email);
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
