import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MockExamsController } from './mock-exams.controller';
import { MockExamsService } from './mock-exams.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [MockExamsController],
  providers: [MockExamsService],
})
export class MockExamsModule {}
