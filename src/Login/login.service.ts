import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { Account } from './login.entity.js';
import { AuthSession } from './session.entity.js';

const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60;
const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

type AccountResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  account: { id: number; email: string };
};

type IssuedSession = {
  accountResponse: AccountResponse;
  refreshToken: string;
};

export type AuthenticatedAccount = {
  id: number;
  email: string;
};

@Injectable()
export class LoginService {
  private readonly accessTokenSecret: string;

  constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
    @InjectRepository(AuthSession)
    private readonly sessions: Repository<AuthSession>,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('AUTH_ACCESS_TOKEN_SECRET');
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error(
        'AUTH_ACCESS_TOKEN_SECRET must be configured with at least 32 bytes',
      );
    }
    this.accessTokenSecret = secret;
  }

  async signup(input: unknown): Promise<IssuedSession> {
    const { email, password } = this.readCredentials(input);
    const existing = await this.accounts.findOneBy({ email });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const account = this.accounts.create({
      email,
      passwordHash: await this.hashPassword(password),
    });
    try {
      await this.accounts.save(account);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
    return this.createSession(account);
  }

  async signin(input: unknown): Promise<IssuedSession> {
    const { email, password } = this.readCredentials(input);
    const account = await this.accounts.findOneBy({ email });
    if (!account || !(await this.verifyPassword(password, account.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.createSession(account);
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.sessions.findOneBy({ refreshTokenHash: tokenHash });
    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now.getTime()
    ) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const account = await this.accounts.findOneBy({ id: session.accountId });
    if (!account) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    const nextRefreshToken = randomBytes(32).toString('base64url');
    const result = await this.sessions
      .createQueryBuilder()
      .update(AuthSession)
      .set({
        refreshTokenHash: this.hashRefreshToken(nextRefreshToken),
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_MS),
        createdAt: now,
      })
      .where('"id" = :id', { id: session.id })
      .andWhere('"refresh_token_hash" = :tokenHash', { tokenHash })
      .andWhere('"revoked_at" IS NULL')
      .andWhere('"expires_at" > :now', { now })
      .execute();

    if (result.affected !== 1) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }
    return this.createSessionResponse(account, nextRefreshToken);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.sessions.update(
      {
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }

  verifyAccessToken(token: string): AuthenticatedAccount | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (
      !encodedHeader ||
      !encodedPayload ||
      !encodedSignature ||
      parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
    ) {
      return null;
    }

    const expectedSignature = createHmac('sha256', this.accessTokenSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actualSignature = Buffer.from(encodedSignature, 'base64url');
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const header = this.decodeJson(encodedHeader);
    const payload = this.decodeJson(encodedPayload);
    if (
      !header ||
      header.alg !== 'HS256' ||
      header.typ !== 'JWT' ||
      !payload ||
      payload.iss !== 'todo-api' ||
      !Number.isSafeInteger(payload.sub) ||
      (payload.sub as number) < 1 ||
      typeof payload.email !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      id: payload.sub as number,
      email: payload.email,
    };
  }

  private async createSession(account: Account): Promise<IssuedSession> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.sessions.save(
      this.sessions.create({
        accountId: account.id,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      }),
    );
    return this.createSessionResponse(account, refreshToken);
  }

  private createSessionResponse(
    account: Account,
    refreshToken: string,
  ): IssuedSession {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: account.id,
        email: account.email,
        iss: 'todo-api',
        iat: issuedAt,
        exp: issuedAt + ACCESS_TOKEN_LIFETIME_SECONDS,
        jti: randomUUID(),
      }),
    ).toString('base64url');
    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac('sha256', this.accessTokenSecret)
      .update(unsignedToken)
      .digest('base64url');

    return {
      accountResponse: {
        accessToken: `${unsignedToken}.${signature}`,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS,
        account: { id: account.id, email: account.email },
      },
      refreshToken,
    };
  }

  private readCredentials(input: unknown): { email: string; password: string } {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Request body must be an object');
    }
    const body = input as Record<string, unknown>;
    if (Object.keys(body).some((key) => key !== 'email' && key !== 'password')) {
      throw new BadRequestException('Only email and password are accepted');
    }
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new BadRequestException('Email and password are required');
    }

    const email = body.email.trim().toLowerCase();
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new BadRequestException('Email must be a valid email address');
    }
    if (
      body.password.length < MIN_PASSWORD_LENGTH ||
      body.password.length > MAX_PASSWORD_LENGTH
    ) {
      throw new BadRequestException(
        `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      );
    }
    return { email, password: body.password };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(PASSWORD_SALT_LENGTH);
    const hash = await this.derivePassword(password, salt);
    return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  }

  private async verifyPassword(
    password: string,
    encodedHash: string,
  ): Promise<boolean> {
    const [algorithm, saltText, hashText, ...extra] = encodedHash.split('$');
    if (algorithm !== 'scrypt' || !saltText || !hashText || extra.length > 0) {
      return false;
    }

    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (
      salt.length !== PASSWORD_SALT_LENGTH ||
      expected.length !== PASSWORD_KEY_LENGTH
    ) {
      return false;
    }
    const actual = await this.derivePassword(password, salt);
    return timingSafeEqual(actual, expected);
  }

  private derivePassword(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        salt,
        PASSWORD_KEY_LENGTH,
        { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, derivedKey) => {
          if (error) {
            reject(error);
          } else {
            resolve(derivedKey);
          }
        },
      );
    });
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private decodeJson(encoded: string): Record<string, unknown> | null {
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      );
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        Array.isArray(decoded)
      ) {
        return null;
      }
      return decoded as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('driverError' in error) ||
      typeof error.driverError !== 'object' ||
      error.driverError === null ||
      !('code' in error.driverError)
    ) {
      return false;
    }
    return error.driverError.code === '23505';
  }
}