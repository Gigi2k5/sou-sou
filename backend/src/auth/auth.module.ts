import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AvatarUnlocksModule } from '../avatar-unlocks/avatar-unlocks.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
          throw new Error('JWT_ACCESS_SECRET manquant dans .env');
        }
        const ttl = config.get<string>('JWT_ACCESS_TTL') ?? '15m';
        return {
          secret,
          // `expiresIn` accepte une StringValue (`ms`) ; on caste au format attendu.
          signOptions: { expiresIn: ttl as unknown as number },
        };
      },
    }),
    EmailModule,
    AvatarUnlocksModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, TokensService, JwtStrategy],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
