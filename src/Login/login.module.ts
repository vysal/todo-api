import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginController } from './login.controller.js';
import { Account } from './login.entity.js';
import { LoginService } from './login.service.js';
import { AuthSession } from './session.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Account, AuthSession])],
  controllers: [LoginController],
  providers: [LoginService],
  exports: [LoginService],
})
export class LoginModule {}
