import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [DatabaseModule, AuthModule, CoursesModule, StudentsModule, NotificationsModule, SupportModule],
})
export class AppModule {}
