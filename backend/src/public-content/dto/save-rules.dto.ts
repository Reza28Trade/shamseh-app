import { IsString, MinLength } from 'class-validator';

export class SaveRulesDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  content!: string;
}
