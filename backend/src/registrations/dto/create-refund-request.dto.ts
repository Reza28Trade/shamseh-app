import { Transform, Type } from 'class-transformer';
import { IsNumber, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateRefundRequestDto {
  @IsString() @MinLength(1)
  registrationId!: string;

  @Type(() => Number) @IsNumber() @Min(1)
  amountRequested!: number;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(5) @Matches(/\\S/)
  reason!: string;
}
