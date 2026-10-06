import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OfflineRequestsController } from './offline-requests.controller';
import { OfflineRequestsService } from './offline-requests.service';

@Module({
  imports: [DatabaseModule],
  controllers: [OfflineRequestsController],
  providers: [OfflineRequestsService],
})
export class OfflineRequestsModule {}
