import { IsString } from 'class-validator';

export class CreateOfflineRequestDto {
  @IsString()
  courseId!: string;

  @IsString()
  sessionId!: string;
}
