import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { TodoResponseDto } from './dto/todo-response.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { TodoService } from './todo.service.js';

@Controller('api/todos')
@ApiTags('todos')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @ApiOperation({ summary: 'Show the list of todos' })
  @ApiOkResponse({ type: TodoResponseDto, isArray: true })
  findAll() {
    return this.todoService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a to-do' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid todo input' })
  create(@Body() body: CreateTodoDto) {
    return this.todoService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a todo title or status' })
  @ApiOkResponse({ type: TodoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid ID or todo input' })
  @ApiNotFoundResponse({ description: 'Todo not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTodoDto) {
    return this.todoService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a to-do' })
  @ApiNoContentResponse({ description: 'Todo deleted' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiNotFoundResponse({ description: 'Todo not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.todoService.remove(id);
  }
}