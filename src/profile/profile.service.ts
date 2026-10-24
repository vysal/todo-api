import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity.js';

type ProfileFields = Pick<Profile, 'username' | 'displayName' | 'email'>;

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
  ) {}

  async get(): Promise<ProfileFields> {
    const profile = await this.profiles.findOneBy({ id: 1 });
    return this.toResponse(profile ?? this.profiles.create({ id: 1 }));
  }

  async update(input: unknown): Promise<ProfileFields> {
    const body = this.asRecord(input);
    const allowed = ['username', 'displayName', 'email'];
    if (Object.keys(body).length === 0 || Object.keys(body).some((key) => !allowed.includes(key))) {
      throw new BadRequestException('Provide one or more supported profile fields');
    }

    const profile = (await this.profiles.findOneBy({ id: 1 })) ?? this.profiles.create({ id: 1 });
    if ('username' in body) {
      profile.username = this.readString(body.username, 'username', 50);
    }
    if ('displayName' in body) {
      profile.displayName = this.readString(body.displayName, 'displayName', 100);
    }
    if ('email' in body) {
      profile.email = this.readEmail(body.email);
    }

    return this.toResponse(await this.profiles.save(profile));
  }

  private asRecord(input: unknown): Record<string, unknown> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new BadRequestException('Request body must be an object');
    }
    return input as Record<string, unknown>;
  }

  private readString(value: unknown, field: string, maxLength: number): string {
    if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
      throw new BadRequestException(`${field} must be a non-empty string of at most ${maxLength} characters`);
    }
    return value.trim();
  }

  private readEmail(value: unknown): string {
    const email = this.readString(value, 'email', 254);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email must be a valid email address');
    }
    return email;
  }

  private toResponse(profile: Profile): ProfileFields {
    return {
      username: profile.username,
      displayName: profile.displayName,
      email: profile.email,
    };
  }
}