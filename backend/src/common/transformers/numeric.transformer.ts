import { ValueTransformer } from 'typeorm';

/**
 * Postgres trả kiểu numeric về dạng string để không mất độ chính xác.
 * Số tiền của CLB nằm gọn trong khoảng an toàn của Number nên chuyển về number
 * cho tiện dùng ở tầng API.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
