import { IsArray, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { CourseStatus } from '@prisma/client';

const WEEK_DAYS = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;

export class CreateCourseDto {
  @IsString()
  title!: string;

  @IsString()
  professor!: string;

  @IsOptional()
  @IsString()
  @IsIn(['MASTER', 'DOCTORATE'])
  level?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsInt()
  @Min(1300)
  academicYear?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(WEEK_DAYS, { each: true })
  classDays?: string[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  classStartTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  classEndTime?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
