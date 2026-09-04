import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from 'src/modules/auth/auth.types';

/**
 * Lấy người dùng đã xác thực kèm bản ghi members tương ứng.
 * @CurrentMember() user: AuthenticatedUser
 * @CurrentMember('member') member: Member
 */
export const CurrentMember = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    return data && user ? user[data] : user;
  },
);
