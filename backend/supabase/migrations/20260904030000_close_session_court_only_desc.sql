-- ---------------------------------------------------------------------
-- "Chốt buổi" giờ chỉ còn nhập TIỀN SÂN từ giao diện (tiền cầu/chi phí
-- khác admin tự ghi ở màn Quỹ CLB, không gắn với buổi đánh cụ thể nữa).
-- Hàm close_session vẫn giữ nguyên tham số p_shuttle_cost/p_other_cost để
-- không phá vỡ khả năng ghi trực tiếp qua API nếu cần, nhưng câu mô tả
-- khoản chi trong sổ quỹ đổi từ "sân + cầu" thành "chi phí buổi" cho đúng
-- với luồng mới (vì trong đa số trường hợp chỉ có tiền sân được ghi ở đây).
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
       'Chi buổi ' || to_char(v_session.play_date, 'DD/MM') || ' · chi phí buổi',
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
