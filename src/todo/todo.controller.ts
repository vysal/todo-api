import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../Login/auth.guard.js';
import { CurrentAccount } from '../Login/current-account.decorator.js';
import type { AuthenticatedAccount } from '../Login/login.service.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { TodoResponseDto } from './dto/todo-response.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { TodoService } from './todo.service.js';

@Controller('api/todos')
@ApiTags('todos')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: 'Show the list of todos' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Bearer access token is required' })
  findAll(@CurrentAccount() account: AuthenticatedAccount) {
    return this.todoService.findAll(account.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a to-do' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid todo input' })
  @ApiUnauthorizedResponse({ description: 'Bearer access token is required' })
  create(
    @Body() body: CreateTodoDto,
    @CurrentAccount() account: AuthenticatedAccount,
  ) {
    return this.todoService.create(body, account.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a todo title or status' })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid ID or todo input' })
  @ApiNotFoundResponse({ description: 'Todo not found' })
  @ApiUnauthorizedResponse({ description: 'Bearer access token is required' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTodoDto,
    @CurrentAccount() account: AuthenticatedAccount,
  ) {
    return this.todoService.update(id, body, account.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a to-do' })
  @ApiNoContentResponse({ description: 'Todo deleted' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiNotFoundResponse({ description: 'Todo not found' })
  @ApiUnauthorizedResponse({ description: 'Bearer access token is required' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentAccount() account: AuthenticatedAccount,
  ) {
    return this.todoService.remove(id, account.id);
  }
}