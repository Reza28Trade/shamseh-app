import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ManagementContactController } from './management-contact.controller';
import { ManagementContactService } from './management-contact.service';

@Module({
  imports: [AuthModule],
  controllers: [ManagementContactController],
  providers: [ManagementContactService],
})
export class ManagementContactModule {}
