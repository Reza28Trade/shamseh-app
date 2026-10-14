import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { ManagementContactModule } from './management-contact/management-contact.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLogInterceptor } from './audit-logs/audit-log.interceptor';

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
    ManagementContactModule,
    RegistrationsModule,
    AuditLogsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }],
})
export class AppModule {}
