import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TodoStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

@Entity()
export class Todo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 200 })
    title!: string;

    @Column({ type: 'varchar', default: 'TODO' })
    status!: TodoStatus;
}