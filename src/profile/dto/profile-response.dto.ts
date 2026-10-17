import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: 'dell' })
  username!: string;

  @ApiProperty({ example: 'Dell User' })
  displayName!: string;

  @ApiProperty({ example: 'dell@example.com' })
  email!: string;
}