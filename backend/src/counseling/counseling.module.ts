import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CounselingController } from './counseling.controller';
import { CounselingService } from './counseling.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CounselingController],
  providers: [CounselingService],
})
export class CounselingModule {}
