import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Profile {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'varchar', length: 50, default: '' })
  username!: string;

  @Column({ name: 'displayName', type: 'varchar', length: 100, default: '' })
  displayName!: string;

  @Column({ type: 'varchar', length: 254, default: '' })
  email!: string;
}