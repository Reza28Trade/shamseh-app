import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReviewInstallmentPaymentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  approvedAmount?: number;

  @IsOptional() @IsString()
  rejectionReason?: string;

  @IsOptional() @IsString()
  reviewNote?: string;
}
