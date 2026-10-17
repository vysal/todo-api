import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'dell', maxLength: 50 })
  username?: string;

  @ApiPropertyOptional({ example: 'Dell User', maxLength: 100 })
  displayName?: string;

  @ApiPropertyOptional({ example: 'dell@example.com', maxLength: 254 })
  email?: string;
}