import { Type } from 'class-transformer';
import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsString() @MinLength(1)
  registrationId!: string;

  @Type(() => Number) @IsNumber() @Min(1)
  amountRequested!: number;

  @IsString() @MinLength(5)
  reason!: string;
}
