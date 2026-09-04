-- ---------------------------------------------------------------------
-- Fix lỗi "column rsvp_status is of type rsvp_status but expression is
-- of type text" khi bấm lại vào tên đã đăng ký (toggle) trên trang RSVP
-- công khai.
--
-- Nguyên nhân: `case when ... then 'cancelled' else 'registered' end`
-- dùng 2 literal chuỗi không ép kiểu — Postgres suy ra kết quả CASE là
-- text, trong khi cột rsvp_status là enum. Bug này CÓ TỪ TRƯỚC (không
-- phải do lần sửa "tự động khóa RSVP" trước đó gây ra) và chỉ lộ ra khi
-- người dùng bấm TOGGLE (bỏ đăng ký một người đã đăng ký) — lượt đăng ký
-- ĐẦU TIÊN của một người thì đi qua nhánh INSERT (dùng giá trị mặc định
-- của cột) nên không đụng tới đoạn CASE này, vẫn chạy được bình thường.
-- ---------------------------------------------------------------------

create or replace function public.rsvp_toggle_member(p_slug text, p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_row     public.session_attendees;
  v_cfg     public.club_settings;
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

  select * into v_cfg from public.club_settings where id = 1;
  if (v_session.play_date + v_session.end_time) at time zone v_cfg.timezone <= now() then
    raise exception 'Buổi này đã kết thúc, không thể đăng ký' using errcode = '55000';
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
      set rsvp_status = (case when rsvp_status = 'registered' then 'cancelled' else 'registered' end)::rsvp_status,
          registered_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  return jsonb_build_object('member_id', p_member_id, 'rsvp_status', v_row.rsvp_status);
end $$;
