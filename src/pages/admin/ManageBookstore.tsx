import { useEffect, useState } from 'react';
import '../../styles/admin/pages/ManageBookstore.css';

type Book = {
  id: string; title: string; description?: string | null; coverImage?: string | null;
  academicLevel?: string | null; category?: string | null; price?: string | number | null;
  discountedPrice?: string | number | null; stockQuantity: number; reservedQuantity: number;
  availableQuantity?: number; isActive: boolean; displayOrder?: number;
};
type Order = {
  id: string; status: string; subtotal: string | number; recipientName: string;
  recipientPhone: string; postalCode: string; shippingAddress: string;
  trackingCode?: string | null; receiptStorageKey?: string | null;
  receiptRejectionReason?: string | null; createdAt: string;
  student: { fullName: string; phone?: string | null };
  items: Array<{ quantity: number; unitPrice: string | number; book: { title: string } }>;
};
type BookForm = {
  title: string; description: string; coverImage: string; academicLevels: string[];
  category: string; price: string; discountedPrice: string; stockQuantity: string;
  displayOrder: string; isActive: boolean;
};
const emptyForm = (): BookForm => ({
  title: '', description: '', coverImage: '', academicLevels: ['MASTER'], category: '',
  price: '', discountedPrice: '', stockQuantity: '0', displayOrder: '0', isActive: true,
});
const labels: Record<string, string> = {
  RESERVED: 'رزرو شده', AWAITING_RECEIPT: 'در انتظار رسید', PAYMENT_REVIEW: 'در انتظار بررسی رسید',
  PAYMENT_REJECTED: 'رسید رد شده', PAID: 'پرداخت تأیید شد', PROCESSING: 'در حال آماده‌سازی',
  SHIPPED: 'ارسال شده', DELIVERED: 'تحویل شده', REFUND_PENDING: 'در انتظار بازپرداخت',
  REFUNDED: 'بازپرداخت انجام شد', CANCELLED: 'لغو شده',
};
const levels = [{ value: 'MASTER', label: 'کارشناسی ارشد' }, { value: 'DOCTORATE', label: 'دکتری' }];
const errorText = (error: unknown) => error instanceof Error ? error.message : 'خطای غیرمنتظره رخ داد.';
function BookCover({ src, title, className = '' }: { src?: string | null; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={`bookstore-cover-fallback ${className}`} role="img" aria-label={`تصویر جلد ${title} موجود نیست`}>بدون تصویر</span>;
  return <img className={className} src={src} alt={`جلد ${title}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

const levelText = (value?: string | null) => {
  const selected = String(value || '').split(',').filter(Boolean);
  if (selected.includes('MASTER') && selected.includes('DOCTORATE')) return 'کارشناسی ارشد و دکتری';
  if (selected.includes('DOCTORATE')) return 'دکتری';
  if (selected.includes('MASTER')) return 'کارشناسی ارشد';
  return 'مقطع ثبت نشده';
};

export function ManageBookstore() {
  const [books, setBooks] = useState<Book[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [bookPage, setBookPage] = useState(1);
  const [bookPageSize, setBookPageSize] = useState(20);
  const [bookTotal, setBookTotal] = useState(0);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [booksRefresh, setBooksRefresh] = useState(0);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(20);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(1);

  const loadBooks = async (pageNumber = bookPage, query = appliedSearch, status = statusFilter, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      page: String(pageNumber), pageSize: String(bookPageSize), search: query, status,
    });
    const response = await fetch('/api/admin/books?' + params.toString(), { credentials: 'include', signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'دریافت فهرست کتاب‌ها ناموفق بود.');
    const actualPage = Math.max(1, Number(result.page || pageNumber));
    if (actualPage !== pageNumber) setBookPage(actualPage);
    setBooks(Array.isArray(result.items) ? result.items : []);
    setBookTotal(Number(result.total || 0));
    setBookTotalPages(Math.max(1, Number(result.totalPages || 1)));
  };

  const loadOrders = async (pageNumber = orderPage, query = orderSearch, status = orderStatusFilter) => {
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: String(orderPageSize), search: query.trim(), status });
    const response = await fetch('/api/admin/book-orders?' + params.toString(), { credentials: 'include' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'دریافت سفارش‌های فروشگاه ناموفق بود.');
    setOrders(Array.isArray(result.items) ? result.items : []);
    setOrderTotal(Number(result.total || 0));
    setOrderTotalPages(Math.max(1, Number(result.totalPages || 1)));
    if (Number(result.page || pageNumber) !== pageNumber) setOrderPage(Math.max(1, Number(result.page || 1)));
  };

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoadingBooks(true);
    void loadBooks(bookPage, appliedSearch, statusFilter, controller.signal)
      .catch(loadError => {
        if (active && (loadError as Error)?.name !== 'AbortError') setError(errorText(loadError));
      })
      .finally(() => { if (active) setLoadingBooks(false); });
    return () => { active = false; controller.abort(); };
  }, [bookPage, bookPageSize, appliedSearch, statusFilter, booksRefresh]);

  useEffect(() => {
    let active = true;
    setLoadingOrders(true);
    void loadOrders(orderPage, orderSearch, orderStatusFilter).catch(loadError => { if (active) setError(errorText(loadError)); })
      .finally(() => { if (active) setLoadingOrders(false); });
    return () => { active = false; };
  }, [orderPage, orderPageSize, orderSearch, orderStatusFilter]);

  const setField = <K extends keyof BookForm,>(key: K, value: BookForm[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setCoverFile(null);
  };

  const startEdit = (book: Book) => {
    setForm({
      title: book.title, description: book.description || '', coverImage: book.coverImage || '',
      academicLevels: String(book.academicLevel || '').split(',').filter(Boolean),
      category: book.category || '', price: String(book.price ?? ''),
      discountedPrice: book.discountedPrice == null ? '' : String(book.discountedPrice),
      stockQuantity: String(book.stockQuantity), displayOrder: String(book.displayOrder ?? 0),
      isActive: book.isActive,
    });
    setCoverFile(null);
    setEditingId(book.id);
    setError('');
    setSuccess('');

  };

  const uploadCover = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('جلد کتاب باید JPG، PNG یا WebP باشد.');
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم تصویر جلد نباید بیشتر از ۵ مگابایت باشد.');
    const data = new FormData();
    data.append('file', file);
    const response = await fetch('/api/admin/books/cover', { method: 'POST', credentials: 'include', body: data });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || 'بارگذاری جلد کتاب ناموفق بود.');
    return String(result.coverImage || '');
  };

  const submitBook = async () => {
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      let coverImage = form.coverImage.trim() || null;
      if (coverFile) coverImage = await uploadCover(coverFile);
      const payload = {
        title: form.title.trim(), description: form.description.trim() || null, coverImage,
        academicLevel: form.academicLevels.join(',') || null, category: form.category.trim() || null,
        price: form.price.trim() === '' ? null : Number(form.price), discountedPrice: form.discountedPrice.trim() === '' ? null : Number(form.discountedPrice),
        stockQuantity: Number(form.stockQuantity), displayOrder: Number(form.displayOrder), isActive: form.isActive,
      };
      const response = await fetch(editingId ? '/api/admin/books/' + encodeURIComponent(editingId) : '/api/admin/books', {
        method: editingId ? 'PATCH' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'ذخیره اطلاعات کتاب ناموفق بود.');
      setBookPage(1); setSearch(''); setAppliedSearch(''); setStatusFilter('ALL');
      setBooksRefresh(value => value + 1);
      setSuccess(editingId ? 'اطلاعات کتاب با موفقیت ویرایش شد.' : 'کتاب جدید با موفقیت ثبت شد.');
      resetForm();
    } catch (submitError) { setError(errorText(submitError)); }
    finally { setBusy(false); }
  };

  const update = async (book: Book, patch: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/books/' + encodeURIComponent(book.id), {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'ذخیره تغییرات ناموفق بود.');
      await loadBooks(); setSuccess('تغییرات کتاب ذخیره شد.');
    } catch (updateError) { setError(errorText(updateError)); }
    finally { setBusy(false); }
  };

  const deleteBook = async (book: Book) => {
    if (!window.confirm('کتاب «' + book.title + '» برای همیشه حذف شود؟ اگر سابقه سفارش یا رزرو داشته باشد، حذف انجام نمی‌شود.')) return;
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/books/' + encodeURIComponent(book.id), { method: 'DELETE', credentials: 'include' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'حذف کتاب ناموفق بود.');
      if (editingId === book.id) resetForm();
      if (books.length === 1 && bookPage > 1) setBookPage(current => current - 1);
      else await loadBooks();
      setSuccess('کتاب حذف شد.');
    } catch (deleteError) { setError(errorText(deleteError)); }
    finally { setBusy(false); }
  };

  const action = async (order: Order, path: string, body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/book-orders/' + encodeURIComponent(order.id) + '/' + path, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'عملیات ناموفق بود.');
      await loadOrders(); setSuccess('عملیات سفارش با موفقیت ثبت شد.');
    } catch (actionError) { setError(errorText(actionError)); }
    finally { setBusy(false); }
  };

  const review = (order: Order, status: 'APPROVED' | 'REJECTED') => {
    const reason = status === 'REJECTED' ? window.prompt('علت رد رسید را وارد کنید:') : '';
    if (status === 'REJECTED' && !reason?.trim()) return;
    void action(order, 'review', { status, reason });
  };
  const money = (value: string | number | null | undefined) => Number(value || 0).toLocaleString('fa-IR') + ' تومان';
  const visibleOrders = orders;

  const validForm = Boolean(form.title.trim() && form.price.trim() !== ''
    && (form.price.trim() === '' ? Boolean(editingId) : (Number.isFinite(Number(form.price)) && Number(form.price) >= 0))
    && Number.isInteger(Number(form.stockQuantity)) && Number(form.stockQuantity) >= 0
    && Number.isInteger(Number(form.displayOrder)) && (Boolean(editingId) || form.academicLevels.length > 0)
    && (form.discountedPrice.trim() === '' || (Number.isFinite(Number(form.discountedPrice))
      && Number(form.discountedPrice) >= 0 && Number(form.discountedPrice) <= Number(form.price))));

  return <section className="admin-legacy-page admin-bookstore-page">
    {error && <div role="alert" className="bookstore-error">{error}</div>}
    {success && <div role="status" className="bookstore-success">{success}</div>}

    {editingId && <button type="button" className="bookstore-edit-backdrop" aria-label="بستن پنل ویرایش" onClick={resetForm} />}
    <div className={"bookstore-card bookstore-form-card admin-master-panel" + (editingId ? " is-editing-drawer" : "")}>
      <div className="bookstore-section-heading">
        <h3 className="bookstore-section-title">{editingId ? 'ویرایش کامل اطلاعات کتاب' : 'افزودن کتاب جدید'}</h3>
        {editingId && <button type="button" className="admin-action-button" onClick={resetForm} disabled={busy}>بستن پنل</button>}
      </div>
      {!editingId && <p className="bookstore-card-description">مشخصات کتاب جدید را وارد کنید.</p>}
      <div className="bookstore-form-grid">
        <div className="bookstore-form-primary">
          <label className="bookstore-field"><span className="bookstore-field-label">عنوان کتاب</span><input value={form.title} onChange={event => setField('title', event.target.value)} placeholder="عنوان کامل کتاب" /></label>
          <label className="bookstore-field"><span className="bookstore-field-label">رشته</span><input value={form.category} onChange={event => setField('category', event.target.value)} placeholder="مثلاً پژوهش هنر" /></label>
          <div className="bookstore-levels"><span className="bookstore-field-label">مقطع تحصیلی</span><div className="bookstore-level-options">
            {levels.map(level => <label className="bookstore-level-option" key={level.value}>
              <input type="checkbox" checked={form.academicLevels.includes(level.value)} onChange={event => setField('academicLevels', event.target.checked ? [...form.academicLevels, level.value] : form.academicLevels.filter(value => value !== level.value))} />
              {level.label}
            </label>)}
          </div></div>
        </div>
        <div className="bookstore-form-pricing">
          <label className="bookstore-field"><span className="bookstore-field-label">قیمت پشت جلد (تومان)</span><input type="number" min="0" value={form.price} onChange={event => setField('price', event.target.value)} placeholder="قیمت اصلی" /></label>
          <label className="bookstore-field"><span className="bookstore-field-label">قیمت با تخفیف (اختیاری)</span><input type="number" min="0" value={form.discountedPrice} onChange={event => setField('discountedPrice', event.target.value)} placeholder="خالی = بدون تخفیف" /></label>
          <label className="bookstore-field"><span className="bookstore-field-label">موجودی کل</span><input type="number" min="0" value={form.stockQuantity} onChange={event => setField('stockQuantity', event.target.value)} /></label>
          <label className="bookstore-field"><span className="bookstore-field-label">ترتیب نمایش</span><input type="number" step="1" value={form.displayOrder} onChange={event => setField('displayOrder', event.target.value)} /></label>
        </div>
        <div className="bookstore-cover-fields">
          <label className="bookstore-upload-field">بارگذاری جلد از دستگاه (JPG، PNG یا WebP؛ حداکثر ۵ مگابایت)
            <input key={editingId || 'new-book'} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setCoverFile(event.target.files?.[0] || null)} />
          </label>
          <label className="bookstore-field"><span className="bookstore-field-label">آدرس تصویر جلد (اختیاری)</span>
            <input type="url" value={form.coverImage} onChange={event => { setField('coverImage', event.target.value); setCoverFile(null); }} placeholder="https://… یا مسیر جلد بارگذاری‌شده" />
          </label>
          {coverFile && <span className="bookstore-field-label bookstore-selected-file">فایل انتخاب‌شده: {coverFile.name}</span>}
          {form.coverImage.trim() && <BookCover className="bookstore-cover-preview" src={form.coverImage.trim()} title={form.title || 'کتاب'} />}
        </div>
        <label className="bookstore-field bookstore-description-field"><span className="bookstore-field-label">توضیحات کتاب</span><textarea value={form.description} onChange={event => setField('description', event.target.value)} placeholder="توضیحات کتاب را وارد کنید" /></label>
        <label className="bookstore-active-toggle"><input type="checkbox" checked={form.isActive} onChange={event => setField('isActive', event.target.checked)} /><span>کتاب فعال و قابل نمایش در فروشگاه باشد</span></label>
      </div>
      <div className="bookstore-form-actions">
        <button type="button" className="admin-action-button" disabled={busy || !validForm} onClick={() => void submitBook()}>{busy ? 'در حال ذخیره…' : editingId ? 'ذخیره تمام تغییرات' : 'ثبت کتاب'}</button>
        {editingId && <button type="button" className="admin-action-button" disabled={busy} onClick={resetForm}>لغو ویرایش</button>}
      </div>
    </div>

    <div className="bookstore-card admin-master-panel">
      <div className="bookstore-section-heading"><h3 className="bookstore-section-title">فهرست کتاب‌ها و موجودی</h3><span className="admin-action-summary bookstore-book-count">{bookTotal.toLocaleString('fa-IR')} کتاب</span></div>
      <div className="bookstore-list-tools">
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { setBookPage(1); setAppliedSearch(search.trim()); } }} placeholder="جست‌وجوی عنوان، رشته یا توضیحات…" aria-label="جست‌وجوی کتاب‌ها" />
        <select value={statusFilter} onChange={event => { setBookPage(1); setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'); }} aria-label="فیلتر وضعیت کتاب">
          <option value="ALL">همه کتاب‌ها</option><option value="ACTIVE">فقط فعال‌ها</option><option value="INACTIVE">فقط غیرفعال‌ها</option>
        </select>
        <button type="button" className="admin-action-button" disabled={loadingBooks} onClick={() => { setBookPage(1); setAppliedSearch(search.trim()); }}>جست‌وجو</button>
      </div>
      <div className="bookstore-table-wrap" role="region" aria-label="جدول فهرست کتاب‌ها" tabIndex={0}>
        <table className="bookstore-data-table bookstore-books-table">
          <thead><tr><th>کتاب</th><th>مقطع و رشته</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>
            {loadingBooks ? <tr><td colSpan={6} className="bookstore-empty">در حال دریافت فهرست کتاب‌ها…</td></tr> : books.map(book => <tr key={book.id}>
              <td><div className="bookstore-table-book"><BookCover className="bookstore-book-cover" src={book.coverImage} title={book.title} /><div><strong>{book.title}</strong>{book.description && <small>{book.description}</small>}</div></div></td>
              <td>{levelText(book.academicLevel)}<small>{book.category || '—'}</small></td>
              <td>{money(book.discountedPrice ?? book.price)}{book.discountedPrice != null && book.discountedPrice !== '' && <small className="bookstore-old-price">{money(book.price)}</small>}</td>
              <td><span>کل: {book.stockQuantity.toLocaleString('fa-IR')}</span><small>رزرو: {book.reservedQuantity.toLocaleString('fa-IR')} · قابل فروش: {(book.availableQuantity ?? Math.max(0, book.stockQuantity - book.reservedQuantity)).toLocaleString('fa-IR')}</small></td>
              <td><span className={"bookstore-status " + (book.isActive ? "is-active" : "is-inactive")}>{book.isActive ? 'فعال' : 'غیرفعال'}</span></td>
              <td><div className="bookstore-table-actions">
                <button type="button" className="admin-action-button" disabled={busy} onClick={() => startEdit(book)}>ویرایش</button>
                <button type="button" className="admin-action-button" disabled={busy} onClick={() => void update(book, { isActive: !book.isActive })}>{book.isActive ? 'غیرفعال' : 'فعال‌سازی'}</button>
                <button type="button" className="admin-action-button bookstore-danger-action" disabled={busy} onClick={() => void deleteBook(book)}>حذف</button>
              </div></td>
            </tr>)}
            {!loadingBooks && books.length === 0 && <tr><td colSpan={6} className="bookstore-empty">{bookTotal === 0 && (appliedSearch || statusFilter !== 'ALL') ? 'کتابی با این جست‌وجو یا فیلتر پیدا نشد.' : 'هنوز کتابی ثبت نشده است.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bookstore-pagination">
        <label>تعداد در صفحه <select value={bookPageSize} onChange={event => { setBookPageSize(Number(event.target.value)); setBookPage(1); }}><option value={10}>۱۰</option><option value={20}>۲۰</option><option value={50}>۵۰</option><option value={100}>۱۰۰</option></select></label>
        <span>نمایش {bookTotal ? ((bookPage-1)*bookPageSize+1).toLocaleString("fa-IR") : 0} تا {Math.min(bookPage*bookPageSize,bookTotal).toLocaleString("fa-IR")} از {bookTotal.toLocaleString("fa-IR")}</span>
        <button type="button" className="admin-action-button" disabled={loadingBooks || bookPage <= 1} onClick={() => setBookPage(current => Math.max(1, current - 1))}>صفحه قبل</button>
        <span>صفحه {bookPage.toLocaleString('fa-IR')} از {bookTotalPages.toLocaleString('fa-IR')}</span>
        <button type="button" className="admin-action-button" disabled={loadingBooks || bookPage >= bookTotalPages} onClick={() => setBookPage(current => Math.min(bookTotalPages, current + 1))}>صفحه بعد</button>
      </div>
    </div>

    <div className="bookstore-card admin-master-panel">
      <div className="bookstore-section-heading"><h3 className="bookstore-section-title">سفارش‌ها و رسیدها</h3><span className="admin-action-summary bookstore-book-count">{orderTotal.toLocaleString('fa-IR')} سفارش</span></div>
      <div className="bookstore-order-tools">
        <input type="search" value={orderSearch} onChange={event => { setOrderSearch(event.target.value); setOrderPage(1); }} placeholder="جست‌وجوی شماره سفارش، نام، موبایل یا کتاب…" aria-label="جست‌وجوی سفارش‌ها" />
        <select value={orderStatusFilter} onChange={event => { setOrderStatusFilter(event.target.value); setOrderPage(1); }} aria-label="فیلتر وضعیت سفارش">
          <option value="ALL">همه وضعیت‌ها</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="bookstore-table-wrap bookstore-orders-wrap" role="region" aria-label="جدول سفارش‌ها و رسیدها" tabIndex={0}>
        <table className="bookstore-data-table bookstore-orders-table">
          <thead><tr><th>شماره و تاریخ</th><th>خریدار و گیرنده</th><th>اقلام سفارش</th><th>مبلغ</th><th>وضعیت و رسید</th><th>عملیات</th></tr></thead>
          <tbody>
            {visibleOrders.map(order => <tr key={order.id}>
              <td><strong>#{order.id.slice(-7)}</strong><small>{new Date(order.createdAt).toLocaleDateString('fa-IR')}</small></td>
              <td><strong>{order.student.fullName}</strong><small>{order.recipientName} · {order.recipientPhone}</small><small>کد پستی: {order.postalCode}</small></td>
              <td>{order.items.map(item => <small key={item.book.title}>{item.book.title} × {item.quantity}</small>)}{order.trackingCode && <small>رهگیری: {order.trackingCode}</small>}{order.receiptRejectionReason && <small>علت رد: {order.receiptRejectionReason}</small>}</td>
              <td>{money(order.subtotal)}</td>
              <td><span className="bookstore-status">{labels[order.status] || order.status}</span>{order.receiptStorageKey && <a className="bookstore-receipt-link" href={'/api/admin/book-orders/' + encodeURIComponent(order.id) + '/receipt'} target="_blank" rel="noreferrer">مشاهده رسید</a>}</td>
              <td><div className="bookstore-table-actions">
                {order.status === 'PAYMENT_REVIEW' && <><button type="button" className="admin-action-button" disabled={busy} onClick={() => review(order, 'APPROVED')}>تأیید رسید</button><button type="button" className="admin-action-button" disabled={busy} onClick={() => review(order, 'REJECTED')}>رد رسید</button></>}
                {['PAYMENT_REJECTED', 'PAYMENT_REVIEW', 'PAID', 'PROCESSING'].includes(order.status) && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { if (window.confirm('برای این سفارش بازپرداخت ثبت شود؟')) void action(order, 'refund', { action: 'REQUEST', note: 'بازپرداخت به درخواست مدیر' }); }}>بازپرداخت</button>}
                {order.status === 'REFUND_PENDING' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { if (window.confirm('آیا بازپرداخت وجه واقعاً انجام شده است؟')) void action(order, 'refund', { action: 'COMPLETE' }); }}>تأیید بازپرداخت</button>}
                {order.status === 'PAID' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => void action(order, 'shipping', { status: 'PROCESSING' })}>آماده‌سازی</button>}
                {['PAID', 'PROCESSING'].includes(order.status) && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { const trackingCode = window.prompt('کد رهگیری مرسوله (اختیاری)') || ''; void action(order, 'shipping', { status: 'SHIPPED', trackingCode }); }}>ثبت ارسال</button>}
                {order.status === 'SHIPPED' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => void action(order, 'shipping', { status: 'DELIVERED' })}>ثبت تحویل</button>}
              </div></td>
            </tr>)}
            {visibleOrders.length === 0 && <tr><td colSpan={6} className="bookstore-empty">{loadingOrders ? 'در حال دریافت سفارش‌ها…' : orderTotal === 0 && (orderSearch || orderStatusFilter !== 'ALL') ? 'سفارشی با این جست‌وجو یا فیلتر پیدا نشد.' : 'هنوز سفارشی ثبت نشده است.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bookstore-pagination">
        <label>تعداد در صفحه <select value={orderPageSize} onChange={event => { setOrderPageSize(Number(event.target.value)); setOrderPage(1); }}><option value={10}>۱۰</option><option value={20}>۲۰</option><option value={50}>۵۰</option><option value={100}>۱۰۰</option></select></label>
        <span>نمایش {orderTotal ? ((orderPage-1)*orderPageSize+1).toLocaleString("fa-IR") : 0} تا {Math.min(orderPage*orderPageSize,orderTotal).toLocaleString("fa-IR")} از {orderTotal.toLocaleString("fa-IR")}</span>
        <button type="button" className="admin-action-button" disabled={loadingOrders || orderPage <= 1} onClick={() => setOrderPage(page => Math.max(1, page - 1))}>صفحه قبل</button>
        <span>صفحه {orderPage.toLocaleString('fa-IR')} از {orderTotalPages.toLocaleString('fa-IR')}</span>
        <button type="button" className="admin-action-button" disabled={loadingOrders || orderPage >= orderTotalPages} onClick={() => setOrderPage(page => Math.min(orderTotalPages, page + 1))}>صفحه بعد</button>
      </div>
    </div>
  </section>;
}
