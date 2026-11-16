# Bookstore operational QA data

این ابزار مستقل است و هیچ صفحه یا قابلیتی به پنل مدیریت اضافه نمی‌کند.

## ایمنی
- اجرای پیش‌فرض فقط برنامه را نمایش می‌دهد و هیچ تغییری در دیتابیس نمی‌دهد.
- نوشتن فقط با هر دو شرط --confirm و متغیر BOOKSTORE_TEST_ALLOW_WRITES=YES فعال می‌شود.
- همه کتاب‌ها، هنرجوها و سفارش‌های آزمایشی با یک شناسه یکتای مشترک مشخص می‌شوند.
- پاک‌سازی فقط با همان شناسه دقیق ممکن است.
- اگر کتاب آزمایشی به سفارشی خارج از مجموعه آزمایشی وصل باشد، پاک‌سازی متوقف می‌شود.
- هیچ migration یا تغییر schema لازم نیست.
- هیچ رکورد موجودی به‌روزرسانی نمی‌شود؛ فقط داده جدید ساخته می‌شود.

## اجرا
از مسیر backend:

```bash
node scripts/bookstore-test-data.cjs
```

ساخت داده:

```bash
BOOKSTORE_TEST_ALLOW_WRITES=YES node scripts/bookstore-test-data.cjs --seed --confirm
```

بعد از تست، شناسه‌ای که خروجی seed چاپ می‌کند را نگه دارید و فقط همان مجموعه را پاک کنید:

```bash
BOOKSTORE_TEST_ALLOW_WRITES=YES node scripts/bookstore-test-data.cjs --cleanup --marker=BOOKSTORE-QA-... --confirm
```

## داده‌های تولیدی
- ۱۰ کتاب فعال با موجودی کافی
- ۱۲ حساب هنرجویی مستقل؛ نام کاربری همان کد ملی آزمایشی است.
- رمز عبور همه حساب‌ها: 09120000000
- ۴۴ سفارش چندقلمی در وضعیت‌های RESERVED، AWAITING_RECEIPT، PAYMENT_REVIEW، PAYMENT_REJECTED، PAID، PROCESSING، SHIPPED، DELIVERED، REFUND_PENDING، REFUNDED و CANCELLED
- رسیدهای PNG نمونه برای سفارش‌هایی که رسید دارند.

رسیدها فایل PNG مصنوعی یک‌پیکسلی هستند؛ مسیر مشاهده و بررسی رسید را تست می‌کنند، نه تشخیص محتوای رسید واقعی.
