import { IsString, MinLength } from 'class-validator';

export class ResetStudentPasswordDto {
  @IsString()
  @MinLength(12)
  password!: string;
}
