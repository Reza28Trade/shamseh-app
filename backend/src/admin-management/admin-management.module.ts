import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdminManagementController],
  providers: [AdminManagementService],
})
export class AdminManagementModule {}
