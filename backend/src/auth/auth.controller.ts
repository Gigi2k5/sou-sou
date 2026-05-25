import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import {
  type AuthUser,
  CurrentUser,
} from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';
import { TokensService } from './tokens.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Créer un compte' })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.signup(dto);
    this.tokens.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Se connecter' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.tokens.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rafraîchir l'access token via le cookie refresh" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshCookie = (req.cookies as Record<string, string> | undefined)?.[
      'refresh_token'
    ];
    const result = await this.auth.refresh(refreshCookie);
    this.tokens.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Se déconnecter (révoque le refresh token)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshCookie = (req.cookies as Record<string, string> | undefined)?.[
      'refresh_token'
    ];
    await this.auth.logout(refreshCookie);
    this.tokens.clearAuthCookies(res);
  }

  @Get('me')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: "Profil de l'utilisateur courant" })
  @ApiResponse({ status: 200, description: 'Profil renvoyé.' })
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.auth.me(user.id) };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Demander un email de réinitialisation de mot de passe',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
  }
}
