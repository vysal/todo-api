import type { Request, Response } from 'express';
import { LoginController } from './login.controller.js';
import { LoginService } from './login.service.js';

describe('LoginController', () => {
  const accessResponse = {
    accessToken: 'signed-access-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    account: { id: 1, email: 'person@example.com' },
  };
  let loginService: {
    signup: ReturnType<typeof vi.fn>;
    signin: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let controller: LoginController;
  let setHeader: ReturnType<typeof vi.fn>;
  let response: Response;

  beforeEach(() => {
    loginService = {
      signup: vi.fn(),
      signin: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };
    controller = new LoginController(loginService as unknown as LoginService);
    setHeader = vi.fn();
    response = { setHeader } as unknown as Response;
  });

  const session = (refreshToken: string) => ({
    accountResponse: accessResponse,
    refreshToken,
  });

  it('signs up and sets an HttpOnly refresh cookie', async () => {
    const credentials = {
      email: 'person@example.com',
      password: 'a-strong-password',
    };
    loginService.signup.mockResolvedValue(session('signup-refresh'));

    const result = await controller.signup(credentials, response);

    expect(loginService.signup).toHaveBeenCalledWith(credentials);
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining(
        'todo_refresh=signup-refresh; HttpOnly; SameSite=Strict',
      ),
    );
    expect(result).toEqual(accessResponse);
  });

  it('signs in and sets a refresh cookie', async () => {
    const credentials = {
      email: 'person@example.com',
      password: 'a-strong-password',
    };
    loginService.signin.mockResolvedValue(session('signin-refresh'));

    const result = await controller.signin(credentials, response);

    expect(loginService.signin).toHaveBeenCalledWith(credentials);
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('todo_refresh=signin-refresh;'),
    );
    expect(result).toEqual(accessResponse);
  });

  it('reads the refresh cookie and sets the rotated cookie', async () => {
    loginService.refresh.mockResolvedValue(session('rotated-refresh'));
    const request = {
      headers: {
        cookie: 'theme=dark; todo_refresh=old-refresh',
      },
    } as Request;

    const result = await controller.refresh(request, response);

    expect(loginService.refresh).toHaveBeenCalledWith('old-refresh');
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('todo_refresh=rotated-refresh;'),
    );
    expect(result).toEqual(accessResponse);
  });

  it('revokes the refresh cookie and clears it on logout', async () => {
    const request = {
      headers: {
        cookie: 'todo_refresh=session-to-revoke',
      },
    } as Request;

    await controller.logout(request, response);

    expect(loginService.logout).toHaveBeenCalledWith('session-to-revoke');
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('todo_refresh=; HttpOnly; SameSite=Strict'),
    );
    expect(setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('Max-Age=0'),
    );
  });
});
