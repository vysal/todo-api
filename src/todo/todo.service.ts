import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo, TodoStatus } from './todo.entity.js';

const statuses: TodoStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo)
    private readonly todos: Repository<Todo>,
  ) {}

  findAll(accountId: number): Promise<Todo[]> {
    return this.todos.find({ where: { accountId }, order: { id: 'ASC' } });
  }

  create(input: unknown, accountId: number): Promise<Todo> {
    const body = this.asRecord(input);
    this.assertOnlyKeys(body, ['title']);
    const title = this.readTitle(body.title);
    return this.todos.save(this.todos.create({ title, accountId }));
  }

  async update(id: number, input: unknown, accountId: number): Promise<Todo> {
    const body = this.asRecord(input);
    this.assertOnlyKeys(body, ['title', 'status']);
    if (Object.keys(body).length === 0) {
      throw new BadRequestException('At least one of title or status is required');
    }

    const todo = await this.todos.findOneBy({ id, accountId });
    if (!todo) {
      throw new NotFoundException(`Todo ${id} was not found`);
    }

    if ('title' in body) {
      todo.title = this.readTitle(body.title);
    }
    if ('status' in body) {
      if (typeof body.status !== 'string' || !statuses.includes(body.status as TodoStatus)) {
        throw new BadRequestException('status must be TODO, IN_PROGRESS, or DONE');
      }
      todo.status = body.status as TodoStatus;
    }
    return this.todos.save(todo);
  }

  async remove(id: number, accountId: number): Promise<void> {
    const result = await this.todos.delete({ id, accountId });
    if (!result.affected) {
      throw new NotFoundException(`Todo ${id} was not found`);
    }
  }

  private asRecord(input: unknown): Record<string, unknown> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Request body must be an object');
    }
    return input as Record<string, unknown>;
  }

  private assertOnlyKeys(body: Record<string, unknown>, allowed: string[]): void {
    if (Object.keys(body).some((key) => !allowed.includes(key))) {
      throw new BadRequestException('Request contains unsupported fields');
    }
  }

  private readTitle(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 200) {
      throw new BadRequestException('title must be a non-empty string of at most 200 characters');
    }
    return value.trim();
  }
}