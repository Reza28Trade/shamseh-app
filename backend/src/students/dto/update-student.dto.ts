import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

enum StudentLevel {
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(StudentLevel)
  academicLevel?: StudentLevel;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseIds?: string[];
}
