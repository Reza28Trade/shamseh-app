import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  sessionNumber!: number;

  @IsDateString()
  sessionDate!: string;

  @IsOptional() @IsString()
  startTime?: string;

  @IsOptional() @IsString()
  endTime?: string;

  @IsOptional() @IsString()
  meetingLink?: string;

  @IsOptional() @IsString()
  description?: string;
}
