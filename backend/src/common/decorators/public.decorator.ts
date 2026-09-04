import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Đánh dấu route không cần đăng nhập (ví dụ trang RSVP công khai). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
