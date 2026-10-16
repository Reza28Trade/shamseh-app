import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewRefundRequestDto {
  @IsIn(['RESERVE', 'REJECT'])
  decision!: 'RESERVE' | 'REJECT';

  @IsOptional() @IsString()
  note?: string;
}
