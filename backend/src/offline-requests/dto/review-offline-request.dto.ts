import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewOfflineRequestDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  meetingLink?: string;
}
