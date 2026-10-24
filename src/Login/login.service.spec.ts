import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Account } from './login.entity.js';
import { LoginService } from './login.service.js';
import { AuthSession } from './session.entity.js';

describe('LoginService', () => {
  const secret = 'test-auth-secret-with-at-least-32-bytes';
  let service: LoginService;
  let accountRepository: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let sessionRepository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let refreshQuery: {
    update: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    andWhere: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };
  let testingModule: TestingModule;

  beforeEach(async () => {
    accountRepository = {
      findOneBy: vi.fn(),
      create: vi.fn((account: Partial<Account>) => ({ id: 1, ...account })),
      save: vi.fn(async (account: Account) => account),
    };
    refreshQuery = {
      update: vi.fn(),
      set: vi.fn(),
      where: vi.fn(),
      andWhere: vi.fn(),
      execute: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    refreshQuery.update.mockReturnValue(refreshQuery);
    refreshQuery.set.mockReturnValue(refreshQuery);
    refreshQuery.where.mockReturnValue(refreshQuery);
    refreshQuery.andWhere.mockReturnValue(refreshQuery);
    sessionRepository = {
      create: vi.fn((session: Partial<AuthSession>) => ({
        id: 1,
        revokedAt: null,
        createdAt: new Date(),
        ...session,
      })),
      save: vi.fn(async (session: AuthSession) => session),
      findOneBy: vi.fn(),
      createQueryBuilder: vi.fn(() => refreshQuery),
      update: vi.fn(),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        { provide: getRepositoryToken(Account), useValue: accountRepository },
        {
          provide: getRepositoryToken(AuthSession),
          useValue: sessionRepository,
        },
        {
          provide: ConfigService,
          useValue: { get: () => secret },
        },
      ],
    }).compile();
    service = testingModule.get(LoginService);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  it('creates an account with a password hash and a refresh session', async () => {
    accountRepository.findOneBy.mockResolvedValue(null);

    const result = await service.signup({
      email: ' USER@example.com ',
      password: 'correct horse battery staple',
    });

    expect(accountRepository.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: expect.stringMatching(/^scrypt\$/),
    });
    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 1,
        refreshTokenHash: expect.not.stringMatching(
          new RegExp(result.refreshToken),
        ),
      }),
    );
    expect(result.accountResponse.account).toEqual({
      id: 1,
      email: 'user@example.com',
    });
    expect(result.accountResponse.accessToken.split('.')).toHaveLength(3);
    expect(service.verifyAccessToken(result.accountResponse.accessToken)).toEqual({
      id: 1,
      email: 'user@example.com',
    });
    expect(
      service.verifyAccessToken(`${result.accountResponse.accessToken}tampered`),
    ).toBeNull();
  });

  it('signs in only when the password matches', async () => {
    accountRepository.findOneBy.mockResolvedValue(null);
    await service.signup({
      email: 'user@example.com',
      password: 'correct horse battery staple',
    });
    const account = accountRepository.save.mock.results[0]?.value;
    accountRepository.findOneBy.mockResolvedValue(account);

    await expect(
      service.signin({
        email: 'user@example.com',
        password: 'correct horse battery staple',
      }),
    ).resolves.toMatchObject({
      accountResponse: {
        account: { email: 'user@example.com' },
      },
    });
    await expect(
      service.signin({
        email: 'user@example.com',
        password: 'incorrect horse battery staple',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed credentials', async () => {
    await expect(
      service.signup({ email: 'not-an-email', password: 'short' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rotates the refresh token and rejects reuse of the previous token', async () => {
    const refreshToken = 'existing-refresh-token';
    const account = { id: 1, email: 'user@example.com' } as Account;
    sessionRepository.findOneBy.mockResolvedValue({
      id: 4,
      accountId: 1,
      refreshTokenHash: 'stored-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    } as AuthSession);
    accountRepository.findOneBy.mockResolvedValue(account);

    const result = await service.refresh(refreshToken);

    expect(result.refreshToken).not.toBe(refreshToken);
    expect(result.accountResponse.account).toEqual({
      id: 1,
      email: 'user@example.com',
    });
    expect(refreshQuery.update).toHaveBeenCalledWith(AuthSession);
    expect(refreshQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshTokenHash: expect.not.stringMatching(refreshToken),
      }),
    );
    expect(refreshQuery.andWhere).toHaveBeenCalledWith(
      '"refresh_token_hash" = :tokenHash',
      expect.objectContaining({ tokenHash: expect.any(String) }),
    );
    expect(refreshQuery.execute).toHaveBeenCalledOnce();

    refreshQuery.execute.mockResolvedValue({ affected: 0 });
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired or revoked refresh session', async () => {
    sessionRepository.findOneBy
      .mockResolvedValueOnce({
        id: 4,
        accountId: 1,
        expiresAt: new Date(Date.now() - 1_000),
        revokedAt: null,
      } as AuthSession)
      .mockResolvedValueOnce({
        id: 5,
        accountId: 1,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
      } as AuthSession);

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(refreshQuery.execute).not.toHaveBeenCalled();
  });

  it('revokes the refresh session on logout', async () => {
    sessionRepository.update.mockResolvedValue({ affected: 1 });

    await service.logout('refresh-token');

    expect(sessionRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshTokenHash: expect.any(String),
        revokedAt: expect.objectContaining({ '@instanceof': Symbol.for('FindOperator') }),
      }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });
});
