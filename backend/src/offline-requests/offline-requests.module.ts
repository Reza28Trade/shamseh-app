import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { OfflineRequestsController } from './offline-requests.controller';
import { OfflineRequestsService } from './offline-requests.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OfflineRequestsController],
  providers: [OfflineRequestsService],
})
export class OfflineRequestsModule {}
