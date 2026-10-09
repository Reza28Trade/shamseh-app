import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAnalysisDto {
  @IsString()
  title!: string;

  @IsOptional() @IsString()
  subtitle?: string;

  @IsString()
  content!: string;

  @IsOptional() @IsString()
  examYear?: string;

  @IsOptional() @IsString()
  examLevel?: string;

  @IsOptional() @IsString()
  resourceUrl?: string;

  @IsOptional() @IsBoolean()
  published?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}
