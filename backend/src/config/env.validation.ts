import * as Joi from 'joi';

/**
 * App sẽ không khởi động nếu thiếu biến môi trường bắt buộc —
 * tốt hơn là lỗi lúc boot thay vì lỗi 500 lúc chạy.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3333),
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().uri({ scheme: [/postgres(ql)?/] }).required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_LOGGING: Joi.boolean().default(false),
  // Vercel/serverless: đặt = 1. Server long-running: 10.
  DATABASE_POOL_MAX: Joi.number().min(1).default(10),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  // Chỉ cần khi project vẫn dùng Legacy JWT Secret (HS256).
  // Project dùng JWT Signing Keys (ECC/RSA) thì bỏ trống — verify qua JWKS.
  SUPABASE_JWT_SECRET: Joi.string().min(16).optional().allow(''),
});
