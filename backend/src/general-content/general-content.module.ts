import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GeneralContentController } from './general-content.controller';
import { GeneralContentService } from './general-content.service';

@Module({
  imports: [AuthModule],
  controllers: [GeneralContentController],
  providers: [GeneralContentService],
  exports: [GeneralContentService],
})
export class GeneralContentModule {}
