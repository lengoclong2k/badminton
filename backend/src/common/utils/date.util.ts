/** yyyy-MM-dd theo giờ địa phương, dùng cho các cột kiểu date. */
export const toDateString = (d: Date = new Date()): string =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** Ngày đầu tháng của một ngày bất kỳ, ví dụ 2026-08-27 -> 2026-08-01. */
export const firstDayOfMonth = (input?: string | Date): string => {
  const d = input ? new Date(input) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
