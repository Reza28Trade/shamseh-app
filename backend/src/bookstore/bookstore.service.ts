import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const RESERVATION_HOURS = 72;
const storageRoot = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';

@Injectable()
export class BookstoreService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') throw new ForbiddenException('Admin access required');
    if (user.role === 'STAFF' && !user.permissions.includes('books')) throw new ForbiddenException('Bookstore permission required');
  }

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');
    return user.studentId;
  }

  async listBooks(user: AuthenticatedUser) {
    await this.releaseExpiredReservations();
    const admin = user.role === 'SUPER_ADMIN' || (user.role === 'STAFF' && user.permissions.includes('books'));
    const books = await this.prisma.book.findMany({
      where: admin ? {} : { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
    });
    return books.map(({ stockQuantity, reservedQuantity, ...book }) => ({
      ...book,
      stockQuantity,
      availableQuantity: Math.max(0, stockQuantity - reservedQuantity),
    }));
  }

  async createBook(user: AuthenticatedUser, body: any) {
    this.requireAdmin(user);
    const title = String(body?.title ?? '').trim();
    const stockQuantity = Number(body?.stockQuantity ?? 0);
    const price = Number(body?.price ?? body?.discountedPrice ?? 0);
    if (!title || !Number.isInteger(stockQuantity) || stockQuantity < 0 || !Number.isFinite(price) || price < 0) {
      throw new BadRequestException('عنوان، قیمت و موجودی معتبر الزامی است.');
    }
    return this.prisma.book.create({ data: {
      title, description: body.description ? String(body.description) : null,
      coverImage: body.coverImage ? String(body.coverImage) : null,
      category: body.category ? String(body.category) : null,
      price, discountedPrice: body.discountedPrice == null || body.discountedPrice === '' ? null : Number(body.discountedPrice),
      stockQuantity, isActive: body.isActive !== false, displayOrder: Number.isInteger(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
    } });
  }

  async updateBook(user: AuthenticatedUser, bookId: string, body: any) {
    this.requireAdmin(user);
    const existing = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!existing) throw new NotFoundException('کتاب پیدا نشد.');
    const data: any = {};
    for (const key of ['title', 'description', 'coverImage', 'category', 'isActive', 'displayOrder', 'price', 'discountedPrice']) {
      if (body[key] !== undefined) data[key] = body[key] === '' && ['description','coverImage','category','discountedPrice'].includes(key) ? null : body[key];
    }
    if (body.stockQuantity !== undefined) {
      const stock = Number(body.stockQuantity);
      if (!Number.isInteger(stock) || stock < existing.reservedQuantity) throw new BadRequestException('موجودی کل نمی‌تواند کمتر از تعداد رزروشده باشد.');
      data.stockQuantity = stock;
    }
    if (data.price !== undefined && (!Number.isFinite(Number(data.price)) || Number(data.price) < 0)) throw new BadRequestException('قیمت معتبر نیست.');
    return this.prisma.book.update({ where: { id: bookId }, data });
  }

  async createOrder(user: AuthenticatedUser, body: any) {
    const studentId = this.requireStudent(user);
    const recipientName = String(body?.recipientName ?? '').trim();
    const recipientPhone = String(body?.recipientPhone ?? '').trim();
    const postalCode = String(body?.postalCode ?? '').trim();
    const shippingAddress = String(body?.shippingAddress ?? '').trim();
    const items: Array<{ bookId: string; quantity: number }> = Array.isArray(body?.items) ? body.items : [];
    if (!recipientName || !recipientPhone || !postalCode || !shippingAddress || !items.length) {
      throw new BadRequestException('اطلاعات گیرنده، آدرس، کد پستی و کتاب‌های سفارش الزامی است.');
    }
    const normalized = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.bookId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new BadRequestException('تعداد کتاب معتبر نیست.');
      normalized.set(String(item.bookId), (normalized.get(String(item.bookId)) || 0) + quantity);
    }
    const expiresAt = new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000);
    return this.prisma.$transaction(async tx => {
      const now = new Date();
      const expired = await tx.bookOrder.findMany({
        where: { status: { in: ['RESERVED', 'AWAITING_RECEIPT'] }, reservationExpiresAt: { lte: now }, receiptUploadedAt: null },
        include: { items: true },
      });
      for (const order of expired) {
        for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { reservedQuantity: { decrement: item.quantity } } });
        await tx.bookOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelledAt: now, reservationExpiresAt: null } });
      }
      const books = [];
      let subtotal = 0;
      for (const [bookId, quantity] of normalized.entries()) {
        const book = await tx.book.findUnique({ where: { id: bookId } });
        if (!book || !book.isActive) throw new BadRequestException('یکی از کتاب‌ها فعال یا موجود نیست.');
        if (book.stockQuantity - book.reservedQuantity < quantity) throw new BadRequestException('موجودی یکی از کتاب‌ها کافی نیست. سفارش ثبت نشد.');
        const unitPrice = Number(book.discountedPrice ?? book.price ?? 0);
        if (unitPrice <= 0) throw new BadRequestException('قیمت یکی از کتاب‌ها هنوز تعیین نشده است.');
        subtotal += unitPrice * quantity;
        books.push({ book, quantity, unitPrice });
      }
      const order = await tx.bookOrder.create({ data: {
        studentId, recipientName, recipientPhone, postalCode, shippingAddress, subtotal,
        status: 'RESERVED', reservationExpiresAt: expiresAt,
        items: { create: books.map(({ book, quantity, unitPrice }) => ({ bookId: book.id, quantity, unitPrice })) },
      }, include: { items: { include: { book: true } } } });
      for (const { book, quantity } of books) await tx.book.update({ where: { id: book.id }, data: { reservedQuantity: { increment: quantity } } });
      return order;
    }, { isolationLevel: 'Serializable' });
  }

  async studentOrders(user: AuthenticatedUser) {
    await this.releaseExpiredReservations();
    const studentId = this.requireStudent(user);
    return this.prisma.bookOrder.findMany({
      where: { studentId }, orderBy: { createdAt: 'desc' }, include: { items: { include: { book: true } } },
    });
  }

  async uploadReceipt(user: AuthenticatedUser, orderId: string, file: any, paymentReference?: string) {
    const studentId = this.requireStudent(user);
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) throw new BadRequestException('فرمت رسید باید تصویر یا PDF باشد.');
    const order = await this.prisma.bookOrder.findFirst({ where: { id: orderId, studentId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (!['RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REJECTED'].includes(order.status)) throw new BadRequestException('در وضعیت فعلی امکان ارسال رسید وجود ندارد.');
    if (order.status !== 'PAYMENT_REJECTED' && order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
      await this.releaseReservation(order.id);
      throw new BadRequestException('مهلت رزرو تمام شده است؛ لطفاً سفارش جدید ثبت کنید.');
    }
    mkdirSync(storageRoot, { recursive: true });
    const filename = randomUUID() + extname(String(file.originalname || '')).toLowerCase().slice(0, 10);
    const fullPath = join(storageRoot, filename);
    writeFileSync(fullPath, file.buffer, { flag: 'wx', mode: 0o600 });
    return this.prisma.bookOrder.update({ where: { id: orderId }, data: {
      status: 'PAYMENT_REVIEW', receiptStorageKey: filename, receiptMimeType: file.mimetype,
      receiptFileSize: BigInt(file.size), receiptUploadedAt: new Date(),
      paymentReference: paymentReference?.trim() || null, paymentSubmittedAt: new Date(),
      receiptRejectionReason: null, reservationExpiresAt: null,
    } });
  }

  private async releaseExpiredReservations() {
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      const expired = await tx.bookOrder.findMany({
        where: { status: { in: ['RESERVED', 'AWAITING_RECEIPT'] }, reservationExpiresAt: { lte: now }, receiptUploadedAt: null },
        include: { items: true },
      });
      for (const order of expired) {
        for (const item of order.items) {
          await tx.book.update({ where: { id: item.bookId }, data: { reservedQuantity: { decrement: item.quantity } } });
        }
        await tx.bookOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelledAt: now, reservationExpiresAt: null } });
      }
    });
  }

  async receiptPath(user: AuthenticatedUser, orderId: string) {
    this.requireAdmin(user);
    const order = await this.prisma.bookOrder.findUnique({ where: { id: orderId } });
    if (!order?.receiptStorageKey) throw new NotFoundException('رسید این سفارش پیدا نشد.');
    return join(storageRoot, order.receiptStorageKey);
  }

  private async releaseReservation(orderId: string) {
    await this.prisma.$transaction(async tx => {
      const order = await tx.bookOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || !['RESERVED', 'AWAITING_RECEIPT'].includes(order.status) || order.receiptUploadedAt) return;
      for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { reservedQuantity: { decrement: item.quantity } } });
      await tx.bookOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelledAt: new Date(), reservationExpiresAt: null } });
    });
  }

  async cancelOrder(user: AuthenticatedUser, orderId: string) {
    const studentId = this.requireStudent(user);
    const order = await this.prisma.bookOrder.findFirst({ where: { id: orderId, studentId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (!['RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REJECTED'].includes(order.status) || order.receiptUploadedAt) {
      throw new BadRequestException('این سفارش را نمی‌توان از پنل هنرجو لغو کرد؛ با پشتیبانی تماس بگیرید.');
    }
    await this.releaseReservation(order.id);
    return { success: true };
  }

  async adminOrders(user: AuthenticatedUser) {
    this.requireAdmin(user);
    await this.releaseExpiredReservations();
    return this.prisma.bookOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, fullName: true, phone: true } }, items: { include: { book: true } }, reviewer: { select: { username: true } }, shipper: { select: { username: true } } },
    });
  }

  async reviewReceipt(user: AuthenticatedUser, orderId: string, body: any) {
    this.requireAdmin(user);
    const order = await this.prisma.bookOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (order.status !== 'PAYMENT_REVIEW') throw new BadRequestException('این سفارش در انتظار بررسی رسید نیست.');
    if (body.status === 'REJECTED') {
      const reason = String(body.reason ?? '').trim();
      if (!reason) throw new BadRequestException('علت رد رسید را بنویسید.');
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: { status: 'PAYMENT_REJECTED', receiptRejectionReason: reason, reviewedAt: new Date(), reviewedById: user.id } });
    }
    if (body.status !== 'APPROVED') throw new BadRequestException('وضعیت بررسی معتبر نیست.');
    return this.prisma.$transaction(async tx => {
      const current = await tx.bookOrder.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!current || current.status !== 'PAYMENT_REVIEW') throw new BadRequestException('وضعیت سفارش تغییر کرده است.');
      for (const item of current.items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId } });
        if (!book || book.reservedQuantity < item.quantity || book.stockQuantity < item.quantity) throw new BadRequestException('موجودی رزروشده سفارش ناسازگار است؛ بررسی دستی لازم است.');
      }
      for (const item of current.items) {
        await tx.book.update({ where: { id: item.bookId }, data: { stockQuantity: { decrement: item.quantity }, reservedQuantity: { decrement: item.quantity } } });
      }
      return tx.bookOrder.update({ where: { id: orderId }, data: { status: 'PAID', reviewedAt: new Date(), reviewedById: user.id } });
    }, { isolationLevel: 'Serializable' });
  }

  async updateShipping(user: AuthenticatedUser, orderId: string, body: any) {
    this.requireAdmin(user);
    const order = await this.prisma.bookOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (body.status === 'PROCESSING' && order.status === 'PAID') {
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: { status: 'PROCESSING' } });
    }
    if (body.status === 'SHIPPED' && ['PAID', 'PROCESSING'].includes(order.status)) {
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: { status: 'SHIPPED', shippedAt: new Date(), shippedById: user.id, trackingCode: String(body.trackingCode ?? '').trim() || null } });
    }
    if (body.status === 'DELIVERED' && order.status === 'SHIPPED') {
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    }
    throw new BadRequestException('تغییر وضعیت ارسال معتبر نیست.');
  }

  async refund(user: AuthenticatedUser, orderId: string, body: any) {
    this.requireAdmin(user);
    const order = await this.prisma.bookOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (body.action === 'REQUEST') {
      if (!['PAID', 'PROCESSING', 'PAYMENT_REJECTED', 'PAYMENT_REVIEW'].includes(order.status)) throw new BadRequestException('این سفارش برای بازپرداخت در وضعیت مناسبی نیست.');
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: { status: 'REFUND_PENDING', refundStatus: 'REQUESTED', refundFromStatus: order.status, refundRequestedAt: new Date(), refundNote: String(body.note ?? '').trim() || null } });
    }
    if (body.action !== 'COMPLETE') throw new BadRequestException('عملیات بازپرداخت معتبر نیست.');
    if (order.status !== 'REFUND_PENDING' || order.refundStatus !== 'REQUESTED') throw new BadRequestException('ابتدا بازپرداخت را در وضعیت انتظار قرار دهید.');
    return this.prisma.$transaction(async tx => {
      // Stock is returned only when the order has not shipped; shipped books are not assumed to be back in inventory.
      if (['PAID', 'PROCESSING'].includes(order.refundFromStatus || '') && !order.shippedAt) {
        for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { stockQuantity: { increment: item.quantity } } });
      } else if (['PAYMENT_REVIEW', 'PAYMENT_REJECTED'].includes(order.refundFromStatus || '')) {
        for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { reservedQuantity: { decrement: item.quantity } } });
      } else if (['RESERVED', 'AWAITING_RECEIPT'].includes(order.refundFromStatus || '')) {
        for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { reservedQuantity: { decrement: item.quantity } } });
      }
      return tx.bookOrder.update({ where: { id: orderId }, data: { status: 'REFUNDED', refundStatus: 'COMPLETED', refundCompletedAt: new Date(), refundById: user.id, refundNote: String(body.note ?? order.refundNote ?? '').trim() || null } });
    });
  }
}
