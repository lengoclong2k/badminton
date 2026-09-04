/** Các enum này khớp 1-1 với enum type trong Postgres (xem supabase/migrations). */

export enum Sex {
  NAM = 'nam',
  NU = 'nu',
}

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum SessionType {
  /** Buổi cố định hàng tuần — đã nằm trong quỹ tháng */
  FIXED = 'fixed',
  /** Buổi phát sinh — không ảnh hưởng quỹ tháng */
  EXTRA = 'extra',
}

export enum SessionStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum RsvpStatus {
  /** Mặc định — chưa ai điểm danh. */
  PENDING = 'pending',
  /** Đã điểm danh: có đi. */
  REGISTERED = 'registered',
  /** Đã điểm danh: không đi. */
  CANCELLED = 'cancelled',
}

export enum AttendanceStatus {
  PENDING = 'pending',
  PRESENT = 'present',
  ABSENT = 'absent',
}

export enum FeeStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  WAIVED = 'waived',
}

export enum PeriodStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum FundEntryType {
  MONTHLY_FEE = 'monthly_fee',
  GUEST_FEE = 'guest_fee',
  SESSION_EXPENSE = 'session_expense',
  OTHER_INCOME = 'other_income',
  OTHER_EXPENSE = 'other_expense',
  ADJUSTMENT = 'adjustment',
}
