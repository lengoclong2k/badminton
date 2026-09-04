import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { PlaySession } from './session.entity';

/** Khung giờ cố định hàng tuần, dùng để sinh các buổi type = fixed. */
@Entity('fixed_schedules')
@Unique('fixed_schedules_unique_slot', ['weekday', 'startTime'])
export class FixedSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 0 = Chủ Nhật … 6 = Thứ Bảy (khớp EXTRACT(DOW) của Postgres). */
  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ type: 'text', nullable: true })
  court: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PlaySession, (s) => s.fixedSchedule)
  sessions: PlaySession[];
}
