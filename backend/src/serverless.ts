import 'reflect-metadata';
import type { RequestListener } from 'http';
import { createNestApp } from './create-app';

/**
 * Instance được cache ở scope module: Vercel tái sử dụng container giữa các
 * request, nên chỉ request đầu tiên sau khi "nguội" mới phải dựng lại Nest và
 * mở kết nối DB. Các request sau đi thẳng vào express đã sẵn sàng.
 */
let cached: Promise<RequestListener> | undefined;

export function bootstrapServerless(): Promise<RequestListener> {
  if (!cached) {
    cached = createNestApp()
      .then(async (app) => {
        await app.init();
        return app.getHttpAdapter().getInstance() as RequestListener;
      })
      .catch((error: unknown) => {
        // Không giữ lại promise lỗi, nếu không mọi request sau đều hỏng theo.
        cached = undefined;
        throw error;
      });
  }
  return cached;
}
