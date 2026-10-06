import { IsString } from 'class-validator';

export class UpdateOfflineRequestDto {
  @IsString()
  courseId!: string;

  @IsString()
  sessionId!: string;
}
