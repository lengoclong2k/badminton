-- ---------------------------------------------------------------------
-- Tự động khóa RSVP công khai khi buổi đánh đã hết giờ chơi.
--
-- Trước đây một buổi ở trạng thái 'open' cho phép đăng ký/hủy đăng ký VÔ
-- THỜI HẠN cho tới khi admin bấm "Chốt buổi" (chốt sổ quỹ) — kể cả khi
-- ngày + giờ chơi đã qua từ lâu. Hai việc "buổi đã diễn ra xong" và "đã
-- ghi sổ quỹ" bị gộp làm một, gây ra chuyện thành viên vẫn bấm đăng ký
-- được cho buổi đã đánh xong.
--
-- Fix ở đây: KHÔNG thêm trạng thái mới, chỉ tính thêm mốc "đã hết giờ
-- chơi" = play_date + end_time (theo múi giờ club_settings.timezone) đã
-- qua so với hiện tại — áp dụng cho is_open (để FE tự vô hiệu hóa nút) và
-- chặn cứng ở rsvp_toggle_member / rsvp_add_guest (để không ai lách qua
-- request trực tiếp). "Chốt buổi" (ghi chi phí, tính quỹ) vẫn là bước
-- riêng, admin chủ động bấm khi nào có số liệu thực tế — không đổi.
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
                    and (v_session.rsvp_closes_at is null or v_session.rsvp_closes_at > now())
                    and (v_session.play_date + v_session.end_time) at time zone v_cfg.timezone > now()),
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
  v_cfg     public.club_settings;
begin
  select * into v_session from public.sessions where slug = p_slug for update;
  if not found then
    raise exception 'Không tìm thấy buổi đánh' using errcode = 'P0002';
  end if;
  if not v_session.guest_slots_enabled or v_session.status <> 'open' then
    raise exception 'Buổi này không mở slot khách' using errcode = '55000';
  end if;

  select * into v_cfg from public.club_settings where id = 1;
  if (v_session.play_date + v_session.end_time) at time zone v_cfg.timezone <= now() then
    raise exception 'Buổi này đã kết thúc, không thể đăng ký' using errcode = '55000';
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
