import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCounselorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

export class SetCounselorActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class AssignCounselorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  studentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  counselorId!: string;
}

export class SendCounselingMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}
