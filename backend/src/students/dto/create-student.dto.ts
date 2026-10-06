import { IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  phone?: string;
}
