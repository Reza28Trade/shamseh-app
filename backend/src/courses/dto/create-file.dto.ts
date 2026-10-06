import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { FileType } from '@prisma/client';

export class CreateFileDto {
  @IsString()
  title!: string;

  @IsEnum(FileType)
  type!: FileType;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  externalUrl?: string;
}
