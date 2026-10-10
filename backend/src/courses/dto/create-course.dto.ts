import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CourseStatus } from '@prisma/client';

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsString()
  professor!: string;

  @IsOptional() @IsString()
  level?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  term?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  startDate?: string;

  @IsOptional() @IsString()
  schedule?: string;

  @IsOptional() @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @IsString()
  coverImage?: string;

  @IsOptional() @IsEnum(CourseStatus)
  status?: CourseStatus;
}
