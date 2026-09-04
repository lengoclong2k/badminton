import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, JWTVerifyGetKey } from 'jose';
import { Repository } from 'typeorm';
import { SupabaseConfig } from 'src/config/configuration';
import { Member } from 'src/database/entities';
import { AuthenticatedUser, SupabaseJwtPayload } from './auth.types';

/**
 * Supabase có hai kiểu ký JWT:
 *
 * 1. JWT Signing Keys (mặc định hiện nay) — khóa bất đối xứng ECC P-256 / RSA,
 *    token ký bằng ES256 hoặc RS256. Backend verify bằng public key lấy từ
 *    endpoint JWKS của project. Không cần biết secret, và khi bạn bấm
 *    "Rotate keys" thì backend tự lấy khóa mới mà không phải deploy lại.
 *
 * 2. Legacy JWT Secret — chuỗi bí mật dùng chung, token ký bằng HS256.
 *    Chỉ còn dùng cho project cũ chưa chuyển sang signing keys.
 *
 * Service này tự nhận diện theo header `alg` của token nên chạy được cả hai,
 * kể cả trong lúc đang chuyển đổi khi token cũ HS256 vẫn còn hạn.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwks: JWTVerifyGetKey;
  private readonly legacySecret?: Uint8Array;

  constructor(
    config: ConfigService,
    @InjectRepository(Member) private readonly members: Repository<Member>,
  ) {
    const cfg = config.getOrThrow<SupabaseConfig>('supabase');

    // jose tự cache bộ khóa và chỉ gọi lại khi gặp `kid` lạ (ví dụ sau khi rotate).
    this.jwks = createRemoteJWKSet(new URL(`${cfg.url}/auth/v1/.well-known/jwks.json`), {
      cacheMaxAge: 10 * 60 * 1000,
      cooldownDuration: 30 * 1000,
    });

    if (cfg.jwtSecret) {
      this.legacySecret = new TextEncoder().encode(cfg.jwtSecret);
    }
  }

  async verifyToken(token: string): Promise<SupabaseJwtPayload> {
    try {
      const { alg } = decodeProtectedHeader(token);

      if (alg === 'HS256') {
        if (!this.legacySecret) {
          throw new Error('Token ký bằng HS256 nhưng chưa cấu hình SUPABASE_JWT_SECRET');
        }
        const { payload } = await jwtVerify(token, this.legacySecret);
        return payload as unknown as SupabaseJwtPayload;
      }

      const { payload } = await jwtVerify(token, this.jwks);
      return payload as unknown as SupabaseJwtPayload;
    } catch (error) {
      this.logger.debug(`Verify token thất bại: ${(error as Error).message}`);
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  /**
   * Ghép tài khoản Supabase với bản ghi members.
   * Nếu chưa gắn, thử khớp theo email (admin đã tạo thành viên từ trước).
   */
  async resolveUser(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    let member = await this.members.findOne({ where: { userId: payload.sub } });

    if (!member && payload.email) {
      const byEmail = await this.members
        .createQueryBuilder('m')
        .where('lower(m.email) = lower(:email)', { email: payload.email })
        .andWhere('m.userId is null')
        .getOne();

      if (byEmail) {
        byEmail.userId = payload.sub;
        member = await this.members.save(byEmail);
        this.logger.log(`Đã gắn tài khoản ${payload.email} vào thành viên ${byEmail.fullName}`);
      }
    }

    return { authUserId: payload.sub, email: payload.email, member: member ?? null };
  }
}
