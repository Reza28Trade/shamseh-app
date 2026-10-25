import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';
import { BookstoreService } from './bookstore.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller()
@UseGuards(AuthGuard)
export class BookstoreController {
  constructor(private readonly bookstore: BookstoreService) {}

  @Get('books')
  listBooks(@Req() req: AuthenticatedRequest) { return this.bookstore.listBooks(req.user); }

  @Post('admin/books')
  createBook(@Req() req: AuthenticatedRequest, @Body() body: any) { return this.bookstore.createBook(req.user, body); }

  @Patch('admin/books/:bookId')
  updateBook(@Req() req: AuthenticatedRequest, @Param('bookId') bookId: string, @Body() body: any) {
    return this.bookstore.updateBook(req.user, bookId, body);
  }

  @Get('student/book-orders')
  studentOrders(@Req() req: AuthenticatedRequest) { return this.bookstore.studentOrders(req.user); }

  @Post('student/book-orders')
  createOrder(@Req() req: AuthenticatedRequest, @Body() body: any) { return this.bookstore.createOrder(req.user, body); }

  @Post('student/book-orders/:orderId/receipt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadReceipt(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string, @UploadedFile() file: any, @Body('paymentReference') paymentReference?: string) {
    if (!file?.buffer) throw new BadRequestException('تصویر یا فایل رسید را انتخاب کنید.');
    return this.bookstore.uploadReceipt(req.user, orderId, file, paymentReference);
  }

  @Post('student/book-orders/:orderId/cancel')
  cancelOrder(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string) {
    return this.bookstore.cancelOrder(req.user, orderId);
  }

  @Get('admin/book-orders')
  adminOrders(@Req() req: AuthenticatedRequest) { return this.bookstore.adminOrders(req.user); }

  @Patch('admin/book-orders/:orderId/review')
  reviewReceipt(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string, @Body() body: any) {
    return this.bookstore.reviewReceipt(req.user, orderId, body);
  }

  @Patch('admin/book-orders/:orderId/shipping')
  updateShipping(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string, @Body() body: any) {
    return this.bookstore.updateShipping(req.user, orderId, body);
  }

  @Patch('admin/book-orders/:orderId/refund')
  refund(@Req() req: AuthenticatedRequest, @Param('orderId') orderId: string, @Body() body: any) {
    return this.bookstore.refund(req.user, orderId, body);
  }
}
