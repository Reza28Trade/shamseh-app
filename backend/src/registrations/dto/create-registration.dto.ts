import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';
import { StudentLevel } from '@prisma/client';

const normalizeDigits = (value: unknown) => typeof value === 'string'
  ? value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  : value;

export class CreateRegistrationDto {
  @IsString() @IsNotEmpty() @MinLength(3)
  applicantFullName!: string;

  @Transform(({ value }) => normalizeDigits(value))
  @IsString() @Matches(/^\d{10}$/)
  nationalId!: string;

  @Transform(({ value }) => normalizeDigits(value))
  @IsString() @Matches(/^09\d{9}$/)
  phone!: string;

  @IsEnum(StudentLevel)
  academicLevel!: StudentLevel;

  @IsString() @IsNotEmpty()
  fieldCode!: string;

  // Multipart form field containing a JSON array of course IDs.
  @IsString()
  courseIds!: string;

  @Transform(({ value }) => Number(normalizeDigits(value)))
  @IsNumber() @Min(1)
  claimedAmount!: number;

  @IsOptional() @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsString()
  trackingCode?: string;
}
