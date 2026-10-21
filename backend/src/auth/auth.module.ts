import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { StudentAccessService } from './student-access.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, StudentAccessService],
  exports: [AuthService, AuthGuard, StudentAccessService],
})
export class AuthModule {}
