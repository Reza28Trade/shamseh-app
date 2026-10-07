import { Module } from '@nestjs/common';
import { GeneralContentController } from './general-content.controller';
import { GeneralContentService } from './general-content.service';

@Module({
  controllers: [GeneralContentController],
  providers: [GeneralContentService],
  exports: [GeneralContentService],
})
export class GeneralContentModule {}
