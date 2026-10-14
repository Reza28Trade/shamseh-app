import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RegistrationApprovalMode } from '@prisma/client';

export class ReviewRegistrationDto {
  @IsEnum(RegistrationApprovalMode)
  mode!: RegistrationApprovalMode;

  @Type(() => Number) @IsNumber() @Min(0)
  discountAmount!: number;

  @IsOptional() @IsString()
  discountReason?: string;

  @IsOptional() @IsString()
  exceptionReason?: string;

  @IsString()
  paymentId!: string;

  @Type(() => Number) @IsNumber() @Min(1)
  approvedAmount!: number;

  @IsDateString()
  firstDueDate!: string;

  @IsOptional() @IsBoolean()
  mockExamEligible?: boolean;

  @IsOptional() @IsString()
  mockExamId?: string;

  @IsOptional() @IsString()
  reviewNote?: string;
}
