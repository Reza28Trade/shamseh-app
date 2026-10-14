import { IsString, Matches, MinLength } from 'class-validator';

export class MarkRefundPaidDto {
  @IsString() @MinLength(3) @Matches(/\S/)
  transferReference!: string;
}
