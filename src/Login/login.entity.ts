import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('account')
@Unique('UQ_account_email', ['email'])
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 128 })
  passwordHash!: string;
}