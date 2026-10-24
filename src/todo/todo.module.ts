import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '../Login/auth.guard.js';
import { LoginModule } from '../Login/login.module.js';
import { Todo } from './todo.entity.js';
import { TodoController } from './todo.controller.js';
import { TodoService } from './todo.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Todo]), LoginModule],
  controllers: [TodoController],
  providers: [TodoService, AuthGuard],
})
export class TodoModule {}