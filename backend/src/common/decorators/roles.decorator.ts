import { SetMetadata } from '@nestjs/common';
import { MemberRole } from 'src/common/enums';

export const ROLES_KEY = 'roles';

/** Giới hạn route theo vai trò, ví dụ @Roles(MemberRole.ADMIN). */
export const Roles = (...roles: MemberRole[]) => SetMetadata(ROLES_KEY, roles);
