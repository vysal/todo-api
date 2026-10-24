import { ApiPropertyOptional } from '@nestjs/swagger';
import type { TodoStatus } from '../todo.entity.js';

export class UpdateTodoDto {
  @ApiPropertyOptional({ example: 'Buy groceries', maxLength: 200 })
  title?: string;

  @ApiPropertyOptional({ enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'IN_PROGRESS' })
  status?: TodoStatus;
}