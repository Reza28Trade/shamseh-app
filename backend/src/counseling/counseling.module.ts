import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CounselingController } from './counseling.controller';
import { CounselingService } from './counseling.service';
import { CounselingChatController } from './counseling-chat.controller';
import { CounselingChatService } from './counseling-chat.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CounselingController, CounselingChatController],
  providers: [CounselingService, CounselingChatService],
})
export class CounselingModule {}
