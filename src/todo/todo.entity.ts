import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Index } from 'typeorm';

export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

@Entity()
@Index('IDX_todo_account_id_id', ['accountId', 'id'])
export class Todo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 200 })
    title!: string;

    @Column({ type: 'varchar', default: 'TODO' })
    status!: TodoStatus;

    @Column({ name: 'account_id', type: 'integer', nullable: true })
    accountId!: number | null;
}