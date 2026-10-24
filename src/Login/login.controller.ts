import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthCredentialsDto } from './dto/auth-credentials.dto.js';
import { LoginService } from './login.service.js';

const REFRESH_COOKIE = 'todo_refresh';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

@Controller('api/auth')
@ApiTags('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create an account' })
  @ApiCreatedResponse({ description: 'Account created and signed in' })
  @ApiResponse({ status: 409, description: 'Email is already registered' })
  async signup(
    @Body() body: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendSession(response, await this.loginService.signup(body));
  }

  @Post('signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in to an account' })
  @ApiOkResponse({ description: 'Signed in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async signin(
    @Body() body: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sendSession(response, await this.loginService.signin(body));
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh the access token and rotate the session' })
  @ApiOkResponse({ description: 'Session refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Refresh session is invalid or expired' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.readRefreshCookie(request);
    return this.sendSession(
      response,
      await this.loginService.refresh(refreshToken),
    );
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Sign out and revoke the refresh session' })
  @ApiResponse({ status: 204, description: 'Signed out successfully' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.loginService.logout(this.readRefreshCookie(request));
    response.setHeader('Set-Cookie', this.clearRefreshCookie());
  }

  private sendSession(
    response: Response,
    session: Awaited<ReturnType<LoginService['signup']>>,
  ) {
    response.setHeader(
      'Set-Cookie',
      this.createRefreshCookie(session.refreshToken),
    );
    return session.accountResponse;
  }

  private readRefreshCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const entry = cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`));
    return entry?.slice(REFRESH_COOKIE.length + 1);
  }

  private createRefreshCookie(token: string): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${REFRESH_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Max-Age=${REFRESH_COOKIE_MAX_AGE}${secure}`;
  }

  private clearRefreshCookie(): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${REFRESH_COOKIE}=; HttpOnly; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
  }
}