import { IsEnum, IsString } from 'class-validator';

enum StudentLevel {
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
}

export class CreateStudentDto {
  @IsString()
  fullName!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  phone!: string;

  @IsEnum(StudentLevel)
  academicLevel!: StudentLevel;
}
