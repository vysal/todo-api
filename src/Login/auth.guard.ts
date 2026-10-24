import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoginService, type AuthenticatedAccount } from './login.service.js';

export type AuthenticatedRequest = Request & {
  account: AuthenticatedAccount;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly loginService: LoginService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const authorization = request.get('authorization');
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match?.[1]) {
      throw new UnauthorizedException('A valid bearer access token is required');
    }

    const account = this.loginService.verifyAccessToken(match[1]);
    if (!account) {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
    request.account = account;
    return true;
  }
}
