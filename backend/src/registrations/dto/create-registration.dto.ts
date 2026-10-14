import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { StudentLevel } from '@prisma/client';

export class CreateRegistrationDto {
  @IsString() @IsNotEmpty() @MinLength(3)
  applicantFullName!: string;

  @IsString() @Matches(/^\d{10}$/)
  nationalId!: string;

  @IsString() @Matches(/^09\d{9}$/)
  phone!: string;

  @IsEnum(StudentLevel)
  academicLevel!: StudentLevel;

  @IsString() @IsNotEmpty()
  fieldCode!: string;

  // Multipart form field containing a JSON array of course IDs.
  @IsString()
  courseIds!: string;

  @Type(() => Number) @IsNumber() @Min(1)
  claimedAmount!: number;

  @IsOptional() @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsString()
  trackingCode?: string;
}
