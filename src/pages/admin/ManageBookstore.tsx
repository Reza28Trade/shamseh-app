import { useEffect, useMemo, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const load = async () => {
    const [bookResponse, orderResponse] = await Promise.all([
      fetch('/api/books', { credentials: 'include' }),
      fetch('/api/admin/book-orders', { credentials: 'include' }),
    ]);
    if (!bookResponse.ok || !orderResponse.ok) throw new Error('دریافت اطلاعات فروشگاه ناموفق بود.');
    const [bookData, orderData] = await Promise.all([bookResponse.json(), orderResponse.json()]);
    setBooks(bookData);
    setOrders(orderData);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try { await load(); }
      catch (loadError) { if (active) setError(errorText(loadError)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const visibleBooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return books.filter(book => {
      const matchesText = !query || [book.title, book.category || '', book.description || '']
        .some(value => value.toLocaleLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? book.isActive : !book.isActive);
      return matchesText && matchesStatus;
    });
  }, [books, search, statusFilter]);

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
    document.querySelector('.bookstore-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      await load();
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
      await load(); setSuccess('تغییرات کتاب ذخیره شد.');
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
      await load(); setSuccess('کتاب حذف شد.');
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
      await load(); setSuccess('عملیات سفارش با موفقیت ثبت شد.');
    } catch (actionError) { setError(errorText(actionError)); }
    finally { setBusy(false); }
  };

  const review = (order: Order, status: 'APPROVED' | 'REJECTED') => {
    const reason = status === 'REJECTED' ? window.prompt('علت رد رسید را وارد کنید:') : '';
    if (status === 'REJECTED' && !reason?.trim()) return;
    void action(order, 'review', { status, reason });
  };
  const money = (value: string | number | null | undefined) => Number(value || 0).toLocaleString('fa-IR') + ' تومان';
  const validForm = Boolean(form.title.trim() && form.price.trim() !== ''
    && (form.price.trim() === '' ? Boolean(editingId) : (Number.isFinite(Number(form.price)) && Number(form.price) >= 0))
    && Number.isInteger(Number(form.stockQuantity)) && Number(form.stockQuantity) >= 0
    && Number.isInteger(Number(form.displayOrder)) && (Boolean(editingId) || form.academicLevels.length > 0)
    && (form.discountedPrice.trim() === '' || (Number.isFinite(Number(form.discountedPrice))
      && Number(form.discountedPrice) >= 0 && Number(form.discountedPrice) <= Number(form.price))));

  return <section className="admin-legacy-page admin-bookstore-page">
    {error && <div role="alert" className="bookstore-error">{error}</div>}
    {success && <div role="status" className="bookstore-success">{success}</div>}

    <div className="bookstore-card bookstore-form-card admin-master-panel">
      <div className="bookstore-section-heading">
        <h3 className="bookstore-section-title">{editingId ? 'ویرایش کامل اطلاعات کتاب' : 'افزودن کتاب جدید'}</h3>
        {editingId && <button type="button" className="admin-action-button" onClick={resetForm} disabled={busy}>انصراف از ویرایش</button>}
      </div>
      <p className="bookstore-card-description">تمام مشخصات کتاب از همین فرم قابل ثبت و ویرایش است. ثبت عنوان یکسان برای چاپ‌ها و ویرایش‌های متفاوت مجاز است.</p>
      <div className="bookstore-form-grid">
        <div className="bookstore-form-primary">
          <label className="bookstore-field"><span className="bookstore-field-label">عنوان کتاب</span><input value={form.title} onChange={event => setField('title', event.target.value)} placeholder="عنوان کامل کتاب" /></label>
          <label className="bookstore-field"><span className="bookstore-field-label">رشته / دسته‌بندی / چاپ</span><input value={form.category} onChange={event => setField('category', event.target.value)} placeholder="مثلاً پژوهش هنر، چاپ دوم" /></label>
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
          {form.coverImage.trim() && <img className="bookstore-cover-preview" src={form.coverImage.trim()} alt="پیش‌نمایش جلد کتاب" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
        </div>
        <label className="bookstore-field bookstore-description-field"><span className="bookstore-field-label">توضیحات کتاب</span><textarea value={form.description} onChange={event => setField('description', event.target.value)} placeholder="توضیحات کتاب را وارد کنید" /></label>
        <label className="bookstore-active-toggle"><input type="checkbox" checked={form.isActive} onChange={event => setField('isActive', event.target.checked)} /><span>کتاب فعال و قابل نمایش در فروشگاه باشد</span></label>
      </div>
      <div className="bookstore-form-actions">
        <button type="button" className="admin-action-button" disabled={busy || !validForm} onClick={() => void submitBook()}>{busy ? 'در حال ذخیره…' : editingId ? 'ذخیره تمام تغییرات' : 'ثبت کتاب'}</button>
        {editingId && <button type="button" className="bookstore-cancel-edit" disabled={busy} onClick={resetForm}>لغو ویرایش</button>}
      </div>
    </div>

    <div className="bookstore-card admin-master-panel">
      <div className="bookstore-section-heading"><h3 className="bookstore-section-title">فهرست کتاب‌ها و موجودی</h3><span className="bookstore-book-meta">{visibleBooks.length.toLocaleString('fa-IR')} از {books.length.toLocaleString('fa-IR')} کتاب</span></div>
      <div className="bookstore-list-tools">
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="جست‌وجوی عنوان، رشته یا توضیحات…" aria-label="جست‌وجوی کتاب‌ها" />
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} aria-label="فیلتر وضعیت کتاب">
          <option value="ALL">همه کتاب‌ها</option><option value="ACTIVE">فقط فعال‌ها</option><option value="INACTIVE">فقط غیرفعال‌ها</option>
        </select>
      </div>
      <div className="bookstore-book-list">
        {loading ? <p className="bookstore-empty">در حال دریافت فهرست کتاب‌ها…</p> : visibleBooks.map(book => <article key={book.id} className="bookstore-book-row admin-surface-card">
          <div className="bookstore-book-main">
            {book.coverImage && <img className="bookstore-book-cover" src={book.coverImage} alt={'جلد ' + book.title} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
            <div className="bookstore-book-copy">
              <strong>{book.title}</strong>
              <div className="bookstore-book-facts">
                <span className="bookstore-book-meta">{levelText(book.academicLevel)}{book.category ? ' · ' + book.category : ''}</span>
                <span className="bookstore-book-data">قیمت پشت جلد: {money(book.price)}</span>
                {book.discountedPrice != null && book.discountedPrice !== '' && <span className="bookstore-book-discount">قیمت با تخفیف: {money(book.discountedPrice)}</span>}
                <span className="bookstore-book-data">موجودی: {book.stockQuantity.toLocaleString('fa-IR')} · رزروشده: {book.reservedQuantity.toLocaleString('fa-IR')} · قابل فروش: {(book.availableQuantity ?? Math.max(0, book.stockQuantity - book.reservedQuantity)).toLocaleString('fa-IR')}</span>
                <span className="bookstore-book-meta">ترتیب نمایش: {Number(book.displayOrder ?? 0).toLocaleString('fa-IR')} · {book.isActive ? 'فعال' : 'غیرفعال'}</span>
              </div>
              {book.description && <p className="bookstore-card-description">{book.description}</p>}
            </div>
          </div>
          <div className="bookstore-book-actions">
            <button type="button" className="admin-action-button" disabled={busy} onClick={() => startEdit(book)}>ویرایش اطلاعات</button>
            <button type="button" className="admin-action-button" disabled={busy} onClick={() => void update(book, { isActive: !book.isActive })}>{book.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>
            <button type="button" className="admin-action-button bookstore-danger-action" disabled={busy} onClick={() => void deleteBook(book)}>حذف کتاب</button>
          </div>
        </article>)}
        {!loading && visibleBooks.length === 0 && <p className="bookstore-empty">{books.length ? 'کتابی با این جست‌وجو یا فیلتر پیدا نشد.' : 'هنوز کتابی ثبت نشده است.'}</p>}
      </div>
    </div>

    <div className="bookstore-card admin-master-panel">
      <h3 className="bookstore-section-title">سفارش‌ها و رسیدها</h3>
      <div className="bookstore-order-list">
        {orders.map(order => <article key={order.id} className="bookstore-order-card admin-surface-card">
          <div className="bookstore-order-head"><strong>سفارش {order.id.slice(-7)} · {order.student.fullName}</strong><span>{labels[order.status] || order.status}</span></div>
          <div className="bookstore-order-details">
            {order.items.map(item => item.book.title + ' × ' + item.quantity).join('، ')} · {money(order.subtotal)}<br />
            گیرنده: {order.recipientName} · {order.recipientPhone} · کد پستی: {order.postalCode}<br />
            نشانی: {order.shippingAddress}<br />
            {order.trackingCode ? 'کد رهگیری: ' + order.trackingCode : ''}{order.receiptRejectionReason ? ' · علت رد رسید: ' + order.receiptRejectionReason : ''}
          </div>
          {order.receiptStorageKey && <a className="bookstore-receipt-link" href={'/api/admin/book-orders/' + encodeURIComponent(order.id) + '/receipt'} target="_blank" rel="noreferrer">مشاهده رسید ارسالی</a>}
          <div className="bookstore-order-actions">
            {order.status === 'PAYMENT_REVIEW' && <><button type="button" className="admin-action-button" disabled={busy} onClick={() => review(order, 'APPROVED')}>تأیید رسید</button><button type="button" className="admin-action-button" disabled={busy} onClick={() => review(order, 'REJECTED')}>رد رسید</button></>}
            {['PAYMENT_REJECTED', 'PAYMENT_REVIEW', 'PAID', 'PROCESSING'].includes(order.status) && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { if (window.confirm('برای این سفارش بازپرداخت ثبت شود؟')) void action(order, 'refund', { action: 'REQUEST', note: 'بازپرداخت به درخواست مدیر' }); }}>ثبت بازپرداخت</button>}
            {order.status === 'REFUND_PENDING' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { if (window.confirm('آیا بازپرداخت وجه واقعاً انجام شده است؟')) void action(order, 'refund', { action: 'COMPLETE' }); }}>تأیید انجام بازپرداخت</button>}
            {order.status === 'PAID' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => void action(order, 'shipping', { status: 'PROCESSING' })}>شروع آماده‌سازی</button>}
            {['PAID', 'PROCESSING'].includes(order.status) && <button type="button" className="admin-action-button" disabled={busy} onClick={() => { const trackingCode = window.prompt('کد رهگیری مرسوله (اختیاری)') || ''; void action(order, 'shipping', { status: 'SHIPPED', trackingCode }); }}>ثبت ارسال</button>}
            {order.status === 'SHIPPED' && <button type="button" className="admin-action-button" disabled={busy} onClick={() => void action(order, 'shipping', { status: 'DELIVERED' })}>ثبت تحویل</button>}
          </div>
        </article>)}
        {orders.length === 0 && <p className="bookstore-empty">{loading ? 'در حال دریافت سفارش‌ها…' : 'هنوز سفارشی ثبت نشده است.'}</p>}
      </div>
    </div>
  </section>;
}
