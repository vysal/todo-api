import { ApiProperty } from '@nestjs/swagger';

export class AuthCredentialsDto {
  @ApiProperty({
    example: 'person@example.com',
    description: 'Account email address',
    maxLength: 254,
  })
  email!: string;

  @ApiProperty({
    example: 'correct horse battery staple',
    description: 'Password (12–128 characters)',
    minLength: 12,
    maxLength: 128,
    format: 'password',
  })
  password!: string;
}
