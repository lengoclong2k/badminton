-- ---------------------------------------------------------------------
-- Xóa 1 đợt thu quỹ (màn "Quản lý đợt quỹ").
-- Chỉ cho xóa khi CHƯA AI ĐÓNG trong đợt đó — đợt đã có tiền vào sổ quỹ
-- mà xóa thì sổ quỹ lệch với khoản quỹ của thành viên. Muốn xóa đợt đã có
-- người đóng thì phải "Hoàn tác thu quỹ" từng người trước.
-- Xóa fee_periods sẽ cascade xóa member_fees của đợt; dòng sổ quỹ cũ (đã
-- xóa mềm do hoàn tác) chỉ bị set null member_fee_id nên không ảnh hưởng.
-- ---------------------------------------------------------------------
create or replace function public.delete_fee_period(p_period_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.fee_periods;
  v_paid   int;
begin
  perform public.require_admin();

  select * into v_period from public.fee_periods where id = p_period_id for update;
  if not found then
    raise exception 'Không tìm thấy đợt thu quỹ' using errcode = 'P0002';
  end if;

  -- Khóa các khoản của đợt để không ai "Thu quỹ" chen vào giữa lúc kiểm tra và xóa.
  perform 1 from public.member_fees where period_id = p_period_id for update;

  select count(*) into v_paid
  from public.member_fees
  where period_id = p_period_id and status = 'paid';

  if v_paid > 0 then
    raise exception 'Đợt này đã có % người đóng quỹ, không thể xóa', v_paid using errcode = '55000';
  end if;

  delete from public.fee_periods where id = p_period_id;

  perform public.log_activity(
    'fee_period.delete',
    'Xóa đợt thu quỹ ' || to_char(v_period.opened_at, 'DD/MM HH24:MI'),
    'fee_period', p_period_id
  );
end $$;

revoke all on function public.delete_fee_period(uuid) from public;
grant execute on function public.delete_fee_period(uuid) to authenticated;
