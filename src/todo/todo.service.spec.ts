import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Todo } from './todo.entity.js';
import { TodoService } from './todo.service.js';

describe('TodoService ownership', () => {
  let service: TodoService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let testingModule: TestingModule;

  beforeEach(async () => {
    repository = {
      find: vi.fn(),
      findOneBy: vi.fn(),
      create: vi.fn((todo: Partial<Todo>) => todo),
      save: vi.fn(async (todo: Todo) => todo),
      delete: vi.fn(),
    };
    testingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: repository },
      ],
    }).compile();
    service = testingModule.get(TodoService);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  it('lists only the current account todos', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAll(3);

    expect(repository.find).toHaveBeenCalledWith({
      where: { accountId: 3 },
      order: { id: 'ASC' },
    });
  });

  it('assigns new todos to the current account', async () => {
    await service.create({ title: 'Write tests' }, 3);

    expect(repository.create).toHaveBeenCalledWith({
      title: 'Write tests',
      accountId: 3,
    });
  });

  it('only updates a todo belonging to the current account', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(
      service.update(5, { title: 'Not mine' }, 3),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 5, accountId: 3 });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('only deletes todos belonging to the current account', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });

    await expect(service.remove(5, 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.delete).toHaveBeenCalledWith({ id: 5, accountId: 3 });
  });
});
