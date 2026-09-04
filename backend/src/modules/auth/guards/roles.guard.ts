import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole, MemberStatus } from 'src/common/enums';
import { ROLES_KEY } from 'src/common/decorators';
import { AuthenticatedUser } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (!user?.member) {
      throw new ForbiddenException('Tài khoản chưa được gắn với thành viên nào trong CLB');
    }
    if (user.member.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Thành viên đang ở trạng thái ngừng hoạt động');
    }
    if (!required.includes(user.member.role)) {
      throw new ForbiddenException('Chỉ chủ nhiệm CLB mới được thực hiện thao tác này');
    }
    return true;
  }
}
