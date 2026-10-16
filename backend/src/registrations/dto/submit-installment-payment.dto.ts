import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitInstallmentPaymentDto {
  @Type(() => Number) @IsNumber() @Min(1)
  claimedAmount!: number;

  @IsOptional() @IsDateString()
  paymentDate?: string;

  @IsOptional() @IsString()
  trackingCode?: string;
}
