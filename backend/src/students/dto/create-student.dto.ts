import { IsString } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  fullName!: string;

  @IsString()
  nationalId!: string;

  @IsString()
  phone!: string;
}
