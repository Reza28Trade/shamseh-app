import { Module } from '@nestjs/common';
import { BookstoreController, PublicBookstoreController } from './bookstore.controller';
import { BookstoreService } from './bookstore.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [BookstoreController, PublicBookstoreController],
  providers: [BookstoreService],
})
export class BookstoreModule {}
