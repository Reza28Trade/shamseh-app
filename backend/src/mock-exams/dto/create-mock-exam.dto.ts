import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { MockExamStatus } from '@prisma/client';

export class CreateMockExamDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  level!: string;

  @IsString()
  @MinLength(1)
  field!: string;

  @IsDateString()
  examDate!: string;

  @IsOptional()
  @IsUrl()
  examUrl?: string;

  @IsOptional()
  @IsEnum(MockExamStatus)
  status?: MockExamStatus;
}
