import { IsString, MinLength } from 'class-validator';

export class MarkRefundPaidDto {
  @IsString() @MinLength(3)
  transferReference!: string;
}
