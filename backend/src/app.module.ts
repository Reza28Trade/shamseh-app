import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';
import { OfflineRequestsModule } from './offline-requests/offline-requests.module';
import { MockExamsModule } from './mock-exams/mock-exams.module';
import { GeneralContentModule } from './general-content/general-content.module';
import { CounselingModule } from './counseling/counseling.module';
import { PublicContentModule } from './public-content/public-content.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    CoursesModule,
    StudentsModule,
    NotificationsModule,
    SupportModule,
    OfflineRequestsModule,
    MockExamsModule,
    GeneralContentModule,
    CounselingModule,
    PublicContentModule,
    FinanceModule,
  ],
})
export class AppModule {}
