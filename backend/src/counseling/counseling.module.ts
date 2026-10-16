import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CounselingChatController } from './counseling-chat.controller';
import { CounselingChatService } from './counseling-chat.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  // Only the online chat workflow is exposed. Legacy appointment/slot models
  // remain in the schema for data preservation, but their HTTP routes are disabled.
  controllers: [CounselingChatController],
  providers: [CounselingChatService],
})
export class CounselingModule {}
