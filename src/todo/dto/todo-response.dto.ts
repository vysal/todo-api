import { ApiProperty } from '@nestjs/swagger';
import type { TodoStatus } from '../todo.entity.js';

export class TodoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Buy groceries' })
  title!: string;

  @ApiProperty({ enum: ['TODO', 'IN_PROGRESS', 'DONE'], example: 'TODO' })
  status!: TodoStatus;
}