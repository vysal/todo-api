import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginService } from './login.service.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';

describe('AuthGuard', () => {
  let verifyAccessToken: ReturnType<typeof vi.fn>;
  let guard: AuthGuard;
  let request: {
    get: ReturnType<typeof vi.fn>;
    account?: AuthenticatedRequest['account'];
  };
  let context: ExecutionContext;

  beforeEach(() => {
    verifyAccessToken = vi.fn();
    guard = new AuthGuard({
      verifyAccessToken,
    } as unknown as LoginService);
    request = { get: vi.fn() };
    context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  });

  it('rejects requests without a bearer token', () => {
    request.get.mockReturnValue(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects invalid bearer tokens', () => {
    request.get.mockReturnValue('Bearer invalid-token');
    verifyAccessToken.mockReturnValue(null);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(verifyAccessToken).toHaveBeenCalledWith('invalid-token');
  });

  it('adds the token account to the request', () => {
    request.get.mockReturnValue('Bearer valid-token');
    verifyAccessToken.mockReturnValue({ id: 7, email: 'user@example.com' });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.account).toEqual({
      id: 7,
      email: 'user@example.com',
    });
  });
});
