import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const RESERVATION_HOURS = 72;
const storageRoot = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';

@Injectable()
export class BookstoreService implements OnModuleInit, OnModuleDestroy {
  private expiryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.releaseExpiredReservations().catch(error => console.error('[Bookstore] reservation expiry failed:', error));
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

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

  async publicBooks() {
    const books = await this.prisma.book.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true, title: true, description: true, coverImage: true, category: true,
        price: true, discountedPrice: true, stockQuantity: true, reservedQuantity: true,
      },
    });
    return books.map(({ stockQuantity, reservedQuantity, ...book }) => ({
      ...book,
      availableQuantity: Math.max(0, stockQuantity - reservedQuantity),
    }));
  }

  async uploadCover(user: AuthenticatedUser, file: any) {
    this.requireAdmin(user);
    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = file?.mimetype ? extensionByMime[file.mimetype] : undefined;
    if (!file?.buffer || !extension) {
      throw new BadRequestException('جلد کتاب باید تصویر JPG، PNG یا WebP باشد.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('حجم تصویر جلد نباید بیشتر از ۵ مگابایت باشد.');
    }
    mkdirSync(storageRoot, { recursive: true });
    const filename = randomUUID() + extension;
    writeFileSync(join(storageRoot, filename), file.buffer, { flag: 'wx', mode: 0o600 });
    return { coverImage: '/api/public/books/covers/' + filename };
  }

  publicCoverPath(filename: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(filename)) {
      throw new NotFoundException('تصویر جلد پیدا نشد.');
    }
    const path = join(storageRoot, filename);
    if (!existsSync(path)) throw new NotFoundException('تصویر جلد پیدا نشد.');
    return path;
  }

  async createBook(user: AuthenticatedUser, body: any) {
    this.requireAdmin(user);
    const title = String(body?.title ?? '').trim();
    const stockQuantity = Number(body?.stockQuantity ?? 0);
    const price = Number(body?.price ?? body?.discountedPrice ?? 0);
    const discountedPrice = body?.discountedPrice == null || body.discountedPrice === '' ? null : Number(body.discountedPrice);
    if (!title || !Number.isInteger(stockQuantity) || stockQuantity < 0 || !Number.isFinite(price) || price < 0
      || (discountedPrice !== null && (!Number.isFinite(discountedPrice) || discountedPrice < 0 || discountedPrice > price))) {
      throw new BadRequestException('عنوان، قیمت، قیمت تخفیف‌خورده و موجودی معتبر الزامی است.');
    }
    return this.prisma.book.create({ data: {
      title, description: body.description ? String(body.description) : null,
      coverImage: body.coverImage ? String(body.coverImage) : null,
      category: body.category ? String(body.category) : null,
      price, discountedPrice,
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
    for (const key of ['price', 'discountedPrice']) {
      if (data[key] !== undefined && data[key] !== null && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0)) {
        throw new BadRequestException('قیمت یا قیمت تخفیف‌خورده معتبر نیست.');
      }
    }
    const effectivePrice = data.price === undefined ? Number(existing.price ?? 0) : Number(data.price);
    const effectiveDiscount = data.discountedPrice === undefined ? (existing.discountedPrice == null ? null : Number(existing.discountedPrice)) : data.discountedPrice;
    if (effectiveDiscount !== null && Number(effectiveDiscount) > effectivePrice) throw new BadRequestException('قیمت تخفیف‌خورده نمی‌تواند از قیمت اصلی بیشتر باشد.');
    if (data.title !== undefined) {
      data.title = String(data.title).trim();
      if (!data.title) throw new BadRequestException('عنوان کتاب نمی‌تواند خالی باشد.');
    }
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
    await this.releaseExpiredReservations();
    const expiresAt = new Date(Date.now() + RESERVATION_HOURS * 60 * 60 * 1000);
    return this.prisma.$transaction(async tx => {
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
    if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
      await this.releaseReservation(order.id);
      throw new BadRequestException('مهلت رزرو تمام شده است؛ لطفاً سفارش جدید ثبت کنید.');
    }
    mkdirSync(storageRoot, { recursive: true });
    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf',
    };
    const filename = randomUUID() + extensionByMime[file.mimetype];
    const fullPath = join(storageRoot, filename);
    writeFileSync(fullPath, file.buffer, { flag: 'wx', mode: 0o600 });
    try {
      const now = new Date();
      const changed = await this.prisma.bookOrder.updateMany({
        where: {
          id: orderId,
          studentId,
          OR: [
            { status: 'PAYMENT_REJECTED', reservationExpiresAt: { gt: now } },
            { status: { in: ['RESERVED', 'AWAITING_RECEIPT'] }, reservationExpiresAt: { gt: now } },
          ],
        },
        data: {
          status: 'PAYMENT_REVIEW', receiptStorageKey: filename, receiptMimeType: file.mimetype,
          receiptFileSize: BigInt(file.size), receiptUploadedAt: now,
          paymentReference: paymentReference?.trim() || null, paymentSubmittedAt: now,
          receiptRejectionReason: null, reservationExpiresAt: null,
        },
      });
      if (changed.count !== 1) throw new BadRequestException('مهلت رزرو تمام شده یا وضعیت سفارش تغییر کرده است؛ لطفاً وضعیت سفارش را تازه‌سازی کنید.');
      return this.prisma.bookOrder.findUnique({ where: { id: orderId } });
    } catch (error) {
      try { unlinkSync(fullPath); } catch { /* The file may already have been removed. */ }
      throw error;
    }
  }

  private async releaseExpiredReservations() {
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      const expired = await tx.bookOrder.findMany({
        where: {
          reservationExpiresAt: { lte: now },
          OR: [
            { status: { in: ['RESERVED', 'AWAITING_RECEIPT'] }, receiptUploadedAt: null },
            { status: 'PAYMENT_REJECTED' },
          ],
        },
        include: { items: true },
      });
      for (const order of expired) {
        // Claim the order atomically so overlapping timer/API requests cannot release the same stock twice.
        const claimed = await tx.bookOrder.updateMany({
          where: {
            id: order.id,
            reservationExpiresAt: { lte: now },
            OR: [
              { status: { in: ['RESERVED', 'AWAITING_RECEIPT'] }, receiptUploadedAt: null },
              { status: 'PAYMENT_REJECTED' },
            ],
          },
          data: { status: 'CANCELLED', cancelledAt: now, reservationExpiresAt: null },
        });
        if (claimed.count !== 1) continue;
        for (const item of order.items) {
          await tx.book.updateMany({ where: { id: item.bookId, reservedQuantity: { gte: item.quantity } }, data: { reservedQuantity: { decrement: item.quantity } } });
        }
      }
    }, { isolationLevel: 'Serializable' });
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
      if (!order || !['RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REJECTED'].includes(order.status)) return;
      const allowedStatuses = ['RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REJECTED'] as const;
      const claimed = await tx.bookOrder.updateMany({
        where: { id: orderId, status: { in: [...allowedStatuses] } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), reservationExpiresAt: null },
      });
      if (claimed.count !== 1) return;
      for (const item of order.items) {
        const changed = await tx.book.updateMany({ where: { id: item.bookId, reservedQuantity: { gte: item.quantity } }, data: { reservedQuantity: { decrement: item.quantity } } });
        if (changed.count !== 1) throw new BadRequestException('موجودی رزروشده ناسازگار است؛ بررسی دستی لازم است.');
      }
    }, { isolationLevel: 'Serializable' });
  }

  async cancelOrder(user: AuthenticatedUser, orderId: string) {
    const studentId = this.requireStudent(user);
    const order = await this.prisma.bookOrder.findFirst({ where: { id: orderId, studentId }, include: { items: true } });
    if (!order) throw new NotFoundException('سفارش پیدا نشد.');
    if (!['RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REJECTED'].includes(order.status)) {
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
      const reviewedAt = new Date();
      const reservationExpiresAt = new Date(reviewedAt.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);
      return this.prisma.bookOrder.update({ where: { id: orderId }, data: {
        status: 'PAYMENT_REJECTED', receiptRejectionReason: reason,
        reviewedAt, reviewedById: user.id, reservationExpiresAt,
      } });
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
      const allowedStatuses = ['PAID', 'PROCESSING', 'PAYMENT_REJECTED', 'PAYMENT_REVIEW'] as const;
      if (!allowedStatuses.includes(order.status as typeof allowedStatuses[number])) throw new BadRequestException('این سفارش برای بازپرداخت در وضعیت مناسبی نیست.');
      const now = new Date();
      const changed = await this.prisma.bookOrder.updateMany({
        where: { id: orderId, status: { in: [...allowedStatuses] }, refundStatus: 'NONE' },
        data: { status: 'REFUND_PENDING', refundStatus: 'REQUESTED', refundFromStatus: order.status, refundRequestedAt: now, refundNote: String(body.note ?? '').trim() || null },
      });
      if (changed.count !== 1) throw new BadRequestException('وضعیت سفارش تغییر کرده است؛ فهرست را تازه‌سازی کنید.');
      return this.prisma.bookOrder.findUnique({ where: { id: orderId } });
    }
    if (body.action !== 'COMPLETE') throw new BadRequestException('عملیات بازپرداخت معتبر نیست.');
    if (order.status !== 'REFUND_PENDING' || order.refundStatus !== 'REQUESTED') throw new BadRequestException('ابتدا بازپرداخت را در وضعیت انتظار قرار دهید.');
    return this.prisma.$transaction(async tx => {
      const completedAt = new Date();
      // Claim the refund before changing inventory; a repeated/concurrent request must not return stock twice.
      const claimed = await tx.bookOrder.updateMany({
        where: { id: orderId, status: 'REFUND_PENDING', refundStatus: 'REQUESTED' },
        data: { status: 'REFUNDED', refundStatus: 'COMPLETED', refundCompletedAt: completedAt, refundById: user.id, refundNote: String(body.note ?? order.refundNote ?? '').trim() || null },
      });
      if (claimed.count !== 1) throw new BadRequestException('بازپرداخت قبلاً انجام شده یا وضعیت سفارش تغییر کرده است.');
      // Stock is returned only when the order has not shipped; shipped books are not assumed to be back in inventory.
      if (['PAID', 'PROCESSING'].includes(order.refundFromStatus || '') && !order.shippedAt) {
        for (const item of order.items) await tx.book.update({ where: { id: item.bookId }, data: { stockQuantity: { increment: item.quantity } } });
      } else if (['PAYMENT_REVIEW', 'PAYMENT_REJECTED', 'RESERVED', 'AWAITING_RECEIPT'].includes(order.refundFromStatus || '')) {
        for (const item of order.items) {
          const changed = await tx.book.updateMany({ where: { id: item.bookId, reservedQuantity: { gte: item.quantity } }, data: { reservedQuantity: { decrement: item.quantity } } });
          if (changed.count !== 1) throw new BadRequestException('موجودی رزروشده ناسازگار است؛ بررسی دستی لازم است.');
        }
      }
      return tx.bookOrder.findUnique({ where: { id: orderId } });
    }, { isolationLevel: 'Serializable' });
  }
}
