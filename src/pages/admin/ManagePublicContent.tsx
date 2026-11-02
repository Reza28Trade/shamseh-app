import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, FileText, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../../styles/admin/pages/ManagePublicContent.css';

type ContentRecord = {
  id: string;
  type: 'RULES' | 'EXAM_ANALYSIS';
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  examYear: string | null;
  examLevel: string | null;
  resourceUrl: string | null;
  published: boolean;
  sortOrder: number;
  updatedAt: string;
};

type NewsRecord = { id: string; title: string; summary: string; imageUrl: string; category: string; date: string; published: boolean };
type NewsForm = Omit<NewsRecord, 'id'>;
const emptyNewsForm: NewsForm = { title: '', summary: '', imageUrl: '', category: 'اطلاعیه', date: '', published: true };
type QuestionRow = { questionNumber: string; explanation: string; topic?: string; className?: string; professor?: string; source?: string; page?: string; status: 'COVERED' | 'PARTIAL' | 'NOT_COVERED' | 'UNKNOWN' };
type AnalysisForm = {
  title: string; subtitle: string; content: string; examYear: string;
  examLevel: string; resourceUrl: string; published: boolean; sortOrder: string;
  fieldCode: string; fieldName: string; totalQuestions: string; startQuestionNumber: string; questions: QuestionRow[];
};
const parseAnalysisContent = (content: string) => {
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.__shamsehExamAnalysis === 1) return parsed as { narrative?: string; fieldCode?: string; fieldName?: string; totalQuestions?: number; startQuestionNumber?: number; coveragePercent?: number | null; questions?: QuestionRow[] };
  } catch { /* legacy plain-text analysis */ }
  return null;
};
const emptyAnalysis: AnalysisForm = {
  title: '', subtitle: '', content: '', examYear: '', examLevel: '',
  resourceUrl: '', published: false, sortOrder: '0', fieldCode: '', fieldName: '', totalQuestions: '0', startQuestionNumber: '1', questions: [],
};
const questionStatusOptions: Array<{ value: 'COVERED' | 'NOT_COVERED'; label: string }> = [
  { value: 'COVERED', label: 'پوشش داده شده' },
  { value: 'NOT_COVERED', label: 'پوشش داده نشده' },
];
const calculateCoverage = (questions: QuestionRow[], startQuestion: number) => {
  const included = questions.filter((question) => Number(String(question.questionNumber).replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))) >= startQuestion);
  if (!included.length) return null;
  return Math.round((included.filter((question) => question.status === 'COVERED').length / included.length) * 100);
};

export const ManagePublicContent: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const dark = theme === 'dark';
  const colors = {
    bg: 'var(--admin-control)',
    alt: 'var(--admin-inner)',
    text: 'var(--admin-text)',
    muted: 'var(--admin-sub)',
    border: 'var(--admin-border)',
    accent: 'var(--admin-accent)',
  };
  const [tab, setTab] = useState<'rules' | 'analysis' | 'news'>('rules');
  const [newsItems, setNewsItems] = useState<NewsRecord[]>([]);
  const [newsForm, setNewsForm] = useState<NewsForm>(emptyNewsForm);
  const [newsEditingId, setNewsEditingId] = useState<string | null>(null);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [newsImageUploading, setNewsImageUploading] = useState(false);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [rulesTitle, setRulesTitle] = useState('قوانین و مقررات آموزشی');
  const [rulesSections, setRulesSections] = useState({
    registration: '', tuition: '', exams: '', counseling: '', resources: '', other: '',
  });
  const ruleSectionFields = [
    { key: 'registration', title: 'ثبت‌نام و شرایط عمومی', hint: 'شرایط ثبت‌نام، انتخاب دوره و نکات عمومی' },
    { key: 'tuition', title: 'شهریه و پرداخت', hint: 'مبلغ شهریه، پیش‌پرداخت و اقساط' },
    { key: 'exams', title: 'آزمون‌های آزمایشی', hint: 'مراحل آزمون ارشد و دکتری، هزینه‌ها و شرایط معافیت' },
    { key: 'counseling', title: 'مشاوره تحصیلی', hint: 'هزینه و شرایط استفاده از خدمات مشاوره' },
    { key: 'resources', title: 'منابع و کتاب‌های آموزشی', hint: 'تخفیف کتاب‌ها و اطلاعات منابع' },
    { key: 'other', title: 'اطلاع‌رسانی و سایر مقررات', hint: 'اطلاعیه‌ها، پیگیری‌ها و نکات تکمیلی' },
  ] as const;
  const [form, setForm] = useState<AnalysisForm>(emptyAnalysis);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [publishFilter, setPublishFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/public-content', { credentials: 'include' });
      if (!response.ok) throw new Error('load');
      const data: ContentRecord[] = await response.json();
      setRecords(Array.isArray(data) ? data : []);
      try {
        const newsResponse = await fetch('/api/content/admin/news', { credentials: 'include' });
        if (newsResponse.ok) {
          const newsData = await newsResponse.json();
          setNewsItems(Array.isArray(newsData) ? newsData.map((item: any, index: number) => ({ id: String(item.id || `news-${index + 1}`), title: String(item.title || ''), summary: String(item.summary || ''), imageUrl: String(item.imageUrl || ''), category: String(item.category || 'اطلاعیه'), date: String(item.date || ''), published: item.published !== false })) : []);
        }
      } catch { /* news editor remains available */ }
      const rules = Array.isArray(data) ? data.find((item) => item.type === 'RULES') : undefined;
      setRulesTitle(rules?.title || 'قوانین و مقررات آموزشی');
      const rawRules = rules?.content || '';
      const parts = rawRules.split(/(?=^\s*[۰-۹0-9]+[.．]\s*)/m).map((part) => part.trim()).filter((part) => Boolean(part) && part !== 'قوانین و مقررات آموزشی آکادمی شمسه');
      const sections = { registration: '', tuition: '', exams: '', counseling: '', resources: '', other: '' };
      for (const part of parts) {
        if (/ثبت‌نام و انتخاب دوره|ثبت نام و انتخاب دوره/.test(part)) sections.registration += (sections.registration ? '\n\n' : '') + part;
        else if (/شهریه و پرداخت|شرایط پرداخت شهریه/.test(part)) sections.tuition += (sections.tuition ? '\n\n' : '') + part;
        else if (/آزمون‌های آزمایشی مقطع کارشناسی ارشد|آزمون‌های آزمایشی مقطع دکتری/.test(part)) sections.exams += (sections.exams ? '\n\n' : '') + part;
        else if (/خدمات مشاوره تحصیلی/.test(part)) sections.counseling += (sections.counseling ? '\n\n' : '') + part;
        else if (/منابع و کتاب‌های آموزشی/.test(part)) sections.resources += (sections.resources ? '\n\n' : '') + part;
        else sections.other += (sections.other ? '\n\n' : '') + part;
      }
      if (rawRules && !parts.length) sections.other = rawRules;
      setRulesSections(sections);
    } catch {
      setError('دریافت محتوای عمومی انجام نشد. اتصال به سرور را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const analyses = useMemo(() => records.filter((item) => item.type === 'EXAM_ANALYSIS'), [records]);
  const years = useMemo(() => Array.from(new Set(analyses.map((item) => item.examYear).filter((value): value is string => Boolean(value)))), [analyses]);
  const filteredAnalyses = analyses.filter((item) => {
    const term = search.trim().toLocaleLowerCase();
    const matchesSearch = !term || [item.title, item.subtitle || '', item.content, item.examYear || '', item.examLevel || ''].some((value) => value.toLocaleLowerCase().includes(term));
    return matchesSearch && (yearFilter === 'ALL' || item.examYear === yearFilter)
      && (publishFilter === 'ALL' || String(item.published) === publishFilter);
  });

  const saveNews = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newsForm.title.trim() || !newsForm.summary.trim()) { setError('عنوان و خلاصه خبر را وارد کنید.'); return; }
    const next = newsEditingId
      ? newsItems.map((item) => item.id === newsEditingId ? { ...newsForm, id: item.id } : item)
      : [...newsItems, { ...newsForm, id: `news-${Date.now()}` }];
    setNewsSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/content/news', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: JSON.stringify(next) }) });
      if (!response.ok) { let message = 'ذخیره خبر انجام نشد.'; try { const data = await response.json(); message = data.message || message; } catch {} throw new Error(Array.isArray(message) ? message.join('، ') : message); }
      setNewsItems(next); setShowNewsForm(false); setNewsEditingId(null); setNewsForm(emptyNewsForm);
      setSuccess(newsEditingId ? 'تغییرات خبر ذخیره شد.' : 'خبر جدید ذخیره شد.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'ذخیره خبر انجام نشد. دسترسی مدیریت و اتصال سرور را بررسی کنید.'); }
    finally { setNewsSaving(false); }
  };
  const uploadNewsImage = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('فرمت تصویر باید JPG، PNG، WEBP یا GIF باشد.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حجم تصویر باید کمتر از ۵ مگابایت باشد.'); return; }
    setNewsImageUploading(true); setError(''); setSuccess('');
    try {
      const data = new FormData(); data.append('file', file);
      const response = await fetch('/api/content/news/image', { method: 'POST', credentials: 'include', body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join('، ') : result.message || 'بارگذاری تصویر انجام نشد.');
      if (!result.imageUrl) throw new Error('نشانی تصویر از سرور دریافت نشد.');
      setNewsForm((current) => ({ ...current, imageUrl: result.imageUrl }));
      setSuccess('تصویر بارگذاری شد. برای ثبت نهایی، خبر را ذخیره کنید.');
    } catch (e) { setError(e instanceof Error ? e.message : 'بارگذاری تصویر انجام نشد.'); }
    finally { setNewsImageUploading(false); }
  };
  const editNews = (item: NewsRecord) => {
    setNewsEditingId(item.id); setNewsForm({ title: item.title, summary: item.summary, imageUrl: item.imageUrl, category: item.category, date: item.date, published: item.published }); setShowNewsForm(true); setError(''); setSuccess('');
  };
  const deleteNews = async (item: NewsRecord) => {
    if (!window.confirm(`خبر «${item.title}» حذف شود؟`)) return;
    const next = newsItems.filter((news) => news.id !== item.id);
    setNewsSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/content/news', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: JSON.stringify(next) }) });
      if (!response.ok) throw new Error('delete');
      setNewsItems(next); setSuccess('خبر حذف شد.'); await load();
    } catch { setError('حذف خبر انجام نشد.'); }
    finally { setNewsSaving(false); }
  };

  const saveRules = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/public-content/rules', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rulesTitle.trim(),
          content: ruleSectionFields.map(({ key, title }) => {
            const value = rulesSections[key].trim();
            if (!value) return '';
            return /^[۰-۹0-9]+[.．]/.test(value) ? value : `${title} 
${value}`.trim();
          }).filter(Boolean).join(`

`),
        }),
      });
      if (!response.ok) throw new Error('save');
      setSuccess('قوانین در پایگاه داده ذخیره شد و در صفحه عمومی نمایش داده می‌شود.');
      await load();
    } catch {
      setError('ذخیره قوانین انجام نشد.');
    } finally { setSaving(false); }
  };

  const startCreate = () => {
    setEditingId(null); setForm(emptyAnalysis); setShowForm(true); setError(''); setSuccess('');
  };

  const startEdit = (item: ContentRecord) => {
    setEditingId(item.id);
    const structured = parseAnalysisContent(item.content);
    const questions = (structured?.questions || []).map((question) => ({ ...question, status: question.status === 'COVERED' ? 'COVERED' as const : 'NOT_COVERED' as const, explanation: question.explanation ?? [question.topic, question.className, question.professor, question.source, question.page].filter(Boolean).join(' · ') }));
    setForm({
      title: item.title, subtitle: item.subtitle || '', content: structured?.narrative ?? item.content,
      examYear: item.examYear || '', examLevel: /دکتری|دکترا|doctorate/i.test(item.examLevel || '') ? 'دکتری' : /ارشد|کارشناسی ارشد|master/i.test(item.examLevel || '') ? 'کارشناسی ارشد' : '',
      resourceUrl: item.resourceUrl || '', published: item.published,
      sortOrder: String(item.sortOrder ?? 0),
      fieldCode: structured?.fieldCode || '',
      fieldName: structured?.fieldName || '',
      totalQuestions: String(Math.max(structured?.totalQuestions ?? questions.length, questions.length, 0)),
      startQuestionNumber: String(structured?.startQuestionNumber ?? 1),
      questions,
    });
    setShowForm(true); setError(''); setSuccess('');
  };

  const saveAnalysis = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalQuestions = Number(form.totalQuestions) || 0;
    const startQuestionNumber = Number(form.startQuestionNumber) || 1;
    const structured = Boolean(form.fieldCode.trim() || form.fieldName.trim() || totalQuestions > 0 || form.questions.length);
    if (!form.title.trim() || (!form.content.trim() && !structured)) { setError('عنوان و حداقل یکی از متن تحلیل یا اطلاعات ساختاریافته الزامی است.'); return; }
    if (totalQuestions < 0 || !Number.isInteger(totalQuestions)) { setError('تعداد سؤال‌ها باید یک عدد صحیح و نامنفی باشد.'); return; }
    if (form.questions.length > totalQuestions) { setError('تعداد ردیف‌های سؤال از تعداد کل سؤال‌ها بیشتر است.'); return; }
    if (!Number.isInteger(startQuestionNumber) || startQuestionNumber < 1 || (totalQuestions > 0 && startQuestionNumber > totalQuestions)) { setError('شماره اولین سؤال مشمول محاسبه باید بین ۱ و تعداد کل سؤال‌ها باشد.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const questions: QuestionRow[] = form.questions.map((question): QuestionRow => ({ ...question, status: question.status === 'COVERED' ? 'COVERED' : 'NOT_COVERED', explanation: question.explanation ?? [question.topic, question.className, question.professor, question.source, question.page].filter(Boolean).join(' · ') }));
    const coverage = calculateCoverage(questions, startQuestionNumber);
    const content = structured ? JSON.stringify({
      __shamsehExamAnalysis: 1,
      narrative: form.content,
      fieldCode: form.fieldCode.trim(),
      fieldName: form.fieldName.trim(),
      totalQuestions,
      startQuestionNumber,
      coveragePercent: coverage,
      questions,
    }) : form.content;
    const payload = {
      title: form.title.trim(),
      content, examYear: form.examYear.trim() || undefined,
      examLevel: form.examLevel.trim() || undefined,
      published: form.published,
      ...(editingId ? {} : { sortOrder: 0 }),
    };
    try {
      const response = await fetch(editingId ? `/api/admin/public-content/analyses/${editingId}` : '/api/admin/public-content/analyses', {
        method: editingId ? 'PATCH' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('save');
      setSuccess(form.published ? 'تحلیل ذخیره و منتشر شد.' : 'تحلیل ذخیره شد و تا زمان انتشار در صفحه عمومی نمایش داده نمی‌شود.');
      setShowForm(false); setEditingId(null); setForm(emptyAnalysis);
      await load();
    } catch { setError('ذخیره تحلیل انجام نشد.'); }
    finally { setSaving(false); }
  };

  const deleteAnalysis = async (item: ContentRecord) => {
    if (!window.confirm(`تحلیل «${item.title}» حذف شود؟`)) return;
    setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/public-content/analyses/${item.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('delete');
      setSuccess('تحلیل حذف شد.');
      await load();
    } catch { setError('حذف تحلیل انجام نشد.'); }
  };



  return (
    <div className="admin-legacy-page admin-public-content-page" style={{ color: colors.text, display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 'none', minWidth: 0, margin: 0 }}>
      <header style={{ padding: '15px 18px', borderRadius: 14, background: 'var(--admin-card)', border: `1px solid ${colors.border}` }}>
        <div className="admin-extracted-managepubliccontent-1"><BookOpenText size={17} color={colors.accent} /><h2 className="admin-extracted-managepubliccontent-2">مدیریت محتوای عمومی</h2></div>
        <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.8, margin: 0 }}>قوانین و تحلیل کنکورهایی که در صفحه اصلی برای هنرجویان نمایش داده می‌شوند را از این بخش مدیریت کنید.</p>
      </header>

      <div className="admin-extracted-managepubliccontent-3">
        <button type="button" onClick={() => { setTab('rules'); setError(''); }} className={`admin-public-button${tab === 'rules' ? ' is-active' : ''}`}><FileText size={15} /> قوانین و مقررات</button>
        <button type="button" onClick={() => { setTab('analysis'); setError(''); }} className={`admin-public-button${tab === 'analysis' ? ' is-active' : ''}`}><BookOpenText size={15} /> تحلیل کنکور سال‌های قبل</button>
        <button type="button" onClick={() => { setTab('news'); setError(''); }} className={`admin-public-button${tab === 'news' ? ' is-active' : ''}`}><FileText size={15} /> اخبار و اسلایدر</button>
      </div>

      {error && <div role="alert" className="admin-public-feedback is-error">{error}</div>}
      {success && <div role="status" className="admin-extracted-managepubliccontent-4">{success}</div>}
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: colors.muted }}>در حال دریافت اطلاعات...</div> : tab === 'news' ? (
        <section style={{ border: '1px solid ' + colors.border, borderRadius: 16, padding: 18, background: colors.alt, display: 'grid', gap: 14 }}>
          <div className="admin-extracted-managepubliccontent-5">
            <div><h2 className="admin-extracted-managepubliccontent-6">مدیریت اخبار و اطلاعیه‌ها</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12 }}>خبرها را از اینجا اضافه، ویرایش، منتشر یا حذف کنید.</p></div>
            <button type="button" onClick={() => { setNewsEditingId(null); setNewsForm(emptyNewsForm); setShowNewsForm(true); setError(''); setSuccess(''); }} className="admin-public-button admin-public-button--primary"><Plus size={15}/> افزودن خبر جدید</button>
          </div>
          {showNewsForm && <form onSubmit={(event) => void saveNews(event)} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 14, border: '1px solid ' + colors.border, background: colors.bg }}>
            <h3 className="admin-extracted-managepubliccontent-7">{newsEditingId ? 'ویرایش خبر' : 'ثبت خبر جدید'}</h3>
            <label className="admin-extracted-managepubliccontent-8">عنوان خبر *
              <input required maxLength={180} value={newsForm.title} onChange={(event) => setNewsForm({ ...newsForm, title: event.target.value })} placeholder="مثلاً آغاز ثبت‌نام آزمون آزمایشی" className="admin-public-input"/>
            </label>
            <label className="admin-extracted-managepubliccontent-9">خلاصه خبر *
              <textarea required rows={3} maxLength={1000} value={newsForm.summary} onChange={(event) => setNewsForm({ ...newsForm, summary: event.target.value })} placeholder="توضیح کوتاه که در صفحه اخبار نمایش داده می‌شود" className="admin-public-input admin-public-input--textarea"/>
            </label>
            <div className="admin-extracted-managepubliccontent-10">
              <label className="admin-extracted-managepubliccontent-11">دسته‌بندی
                <select value={newsForm.category} onChange={(event) => setNewsForm({ ...newsForm, category: event.target.value })} className="admin-public-input"><option>اطلاعیه</option><option>اخبار آموزشی</option><option>ثبت‌نام دوره‌ها</option><option>آزمون‌ها</option><option>رویدادها</option></select>
              </label>
              <label className="admin-extracted-managepubliccontent-12">تاریخ خبر (اختیاری)
                <input value={newsForm.date} onChange={(event) => setNewsForm({ ...newsForm, date: event.target.value })} placeholder="مثلاً ۱۴۰۵/۰۸/۰۳" className="admin-public-input"/>
              </label>
            </div>
            <div className="admin-extracted-managepubliccontent-13">
              تصویر خبر (اختیاری)
              <div className="admin-extracted-managepubliccontent-14">
                <label className="admin-public-button admin-public-upload-button" aria-busy={newsImageUploading}>
                  <FileText size={15}/>{newsImageUploading ? 'در حال بارگذاری…' : 'انتخاب تصویر از کامپیوتر'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={newsImageUploading} onChange={(event) => { void uploadNewsImage(event.target.files?.[0]); event.currentTarget.value = ''; }} className="admin-extracted-managepubliccontent-15"/>
                </label>
                <span style={{ color: colors.muted, fontSize: 11, fontWeight: 400 }}>JPG، PNG، WEBP یا GIF · حداکثر ۵ مگابایت</span>
              </div>
              <label className="admin-extracted-managepubliccontent-16">یا نشانی تصویر
                <input dir="ltr" value={newsForm.imageUrl} onChange={(event) => setNewsForm({ ...newsForm, imageUrl: event.target.value })} placeholder="https://..." className="admin-public-input admin-public-input--ltr"/>
              </label>
              {newsForm.imageUrl && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 8, border: '1px solid ' + colors.border, borderRadius: 10 }}>
                <img src={newsForm.imageUrl} alt="پیش‌نمایش تصویر خبر" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} className="admin-extracted-managepubliccontent-17"/>
                <button type="button" onClick={() => setNewsForm({ ...newsForm, imageUrl: '' })} className="admin-public-button">حذف تصویر</button>
              </div>}
            </div>
            <label className="admin-extracted-managepubliccontent-18"><input type="checkbox" checked={newsForm.published} onChange={(event) => setNewsForm({ ...newsForm, published: event.target.checked })}/> انتشار در صفحه اخبار</label>
            <div className="admin-extracted-managepubliccontent-19"><button type="submit" disabled={newsSaving} className="admin-public-button admin-public-button--primary"><Save size={15}/>{newsSaving ? 'در حال ذخیره…' : newsEditingId ? 'ذخیره تغییرات' : 'ذخیره خبر'}</button><button type="button" onClick={() => { setShowNewsForm(false); setNewsEditingId(null); setNewsForm(emptyNewsForm); }} className="admin-public-button">انصراف</button></div>
          </form>}
          {newsItems.length === 0 ? <div style={{ padding: 24, textAlign: 'center', border: '1px dashed ' + colors.border, borderRadius: 12, color: colors.muted }}>هنوز خبری ثبت نشده است. برای شروع روی «افزودن خبر جدید» بزنید.</div> : <div className="admin-extracted-managepubliccontent-20">
            <div style={{ color: colors.muted, fontSize: 12 }}>تعداد خبرهای ثبت‌شده: <strong>{newsItems.length}</strong></div>
            {newsItems.map((item) => <article key={item.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: 14, border: '1px solid ' + colors.border, borderRadius: 12, background: colors.bg }}>
              <div className="admin-extracted-managepubliccontent-21">
                <div className="admin-extracted-managepubliccontent-22"><strong className="admin-extracted-managepubliccontent-23">{item.title || 'بدون عنوان'}</strong><span className={`admin-public-publish-status${item.published ? ' is-published' : ' is-draft'}`}>{item.published ? 'منتشرشده' : 'پیش‌نویس'}</span><span style={{ fontSize: 10, color: colors.muted }}>{item.category}{item.date ? ' · ' + item.date : ''}</span></div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.9, color: colors.muted }}>{item.summary}</p>
              </div>
              <div className="admin-extracted-managepubliccontent-24"><button type="button" onClick={() => editNews(item)} className="admin-public-button"><Pencil size={14}/> ویرایش</button><button type="button" disabled={newsSaving} onClick={() => void deleteNews(item)} className="admin-public-button admin-public-button--danger"><Trash2 size={14}/> حذف</button></div>
            </article>)}
          </div>}
        </section>
      ) : tab === 'rules' ? (
        <form onSubmit={saveRules} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 18, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="admin-extracted-managepubliccontent-25">عنوان صفحه قوانین
            <input required value={rulesTitle} onChange={(event) => setRulesTitle(event.target.value)} className="admin-public-input" />
          </label>
          <div className="admin-extracted-managepubliccontent-26">
            {ruleSectionFields.map(({ key, title, hint }) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14, background: colors.alt }}>
                {title}
                <span style={{ fontSize: 10, color: colors.muted, fontWeight: 500 }}>{hint}</span>
                <textarea
                  value={rulesSections[key]}
                  onChange={(event) => setRulesSections((current) => ({ ...current, [key]: event.target.value }))}
                  rows={7}
                  className="admin-public-input admin-public-input--textarea admin-public-input--large"
                  placeholder={`متن مربوط به بخش «${title}» را وارد کنید...`}
                />
              </label>
            ))}
          </div>
          <div className="admin-extracted-managepubliccontent-27">
            <button type="submit" disabled={saving} className="admin-public-button admin-public-button--primary"><Save size={15} />{saving ? 'در حال ذخیره...' : 'ذخیره و انتشار قوانین'}</button>
            <span style={{ color: colors.muted, fontSize: 11 }}>ذخیره در پایگاه داده؛ قابل مشاهده برای همه بازدیدکنندگان.</span>
          </div>
        </form>
      ) : (
        <div className="admin-extracted-managepubliccontent-28">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 14, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16 }}>
            <div className="admin-extracted-managepubliccontent-29"><Search size={15} color={colors.muted} className="admin-extracted-managepubliccontent-30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی عنوان، سال یا متن..." className="admin-public-input admin-public-input--search" /></div>
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} className="admin-public-input"><option value="ALL">همه سال‌ها</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value)} className="admin-public-input"><option value="ALL">همه وضعیت‌ها</option><option value="true">منتشرشده</option><option value="false">پیش‌نویس</option></select>
            <button type="button" onClick={startCreate} className="admin-public-button admin-public-button--primary"><Plus size={15} /> افزودن تحلیل</button>
          </div>

          {showForm && <form onSubmit={saveAnalysis} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 18, padding: '18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 className="admin-extracted-managepubliccontent-31">{editingId ? 'ویرایش تحلیل' : 'ثبت تحلیل جدید'}</h3>
            <div className="admin-extracted-managepubliccontent-32">
              <label className="admin-extracted-managepubliccontent-33">عنوان *<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="admin-public-input" /></label>
              <label className="admin-extracted-managepubliccontent-34">سال کنکور<input value={form.examYear} onChange={(event) => setForm({ ...form, examYear: event.target.value })} className="admin-public-input" placeholder="مثلاً ۱۴۰۵" /></label>
              <label className="admin-extracted-managepubliccontent-35">مقطع *<select required value={form.examLevel} onChange={(event) => setForm({ ...form, examLevel: event.target.value })} className="admin-public-input"><option value="">انتخاب مقطع</option><option value="کارشناسی ارشد">کارشناسی ارشد</option><option value="دکتری">دکتری</option></select></label>
            </div>
            <label className="admin-extracted-managepubliccontent-36">متن تحلیل (اختیاری در صورت ثبت اطلاعات ساختاریافته)<textarea rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="admin-public-input admin-public-input--textarea" placeholder="توضیحات تکمیلی تحلیل را وارد کنید؛ اگر اطلاعات ساختاریافته ثبت می‌کنید، این بخش می‌تواند خالی بماند." /></label>
            <section style={{ border: '1px solid ' + colors.border, borderRadius: 14, padding: 15, display: 'flex', flexDirection: 'column', gap: 12, background: colors.alt }}>
              <div><strong className="admin-extracted-managepubliccontent-37">اطلاعات ساختاریافته پوشش و سؤال‌ها</strong><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 11, lineHeight: 1.9 }}>وضعیت هر سؤال را مشخص کنید. درصد پوشش بر اساس سؤال‌های شماره‌گذاری‌شده از شماره شروع محاسبه می‌شود؛ سؤال‌های قبل از آن نادیده گرفته می‌شوند.</p></div>
              <div className="admin-extracted-managepubliccontent-38">
                <label className="admin-extracted-managepubliccontent-39">کدرشته<input value={form.fieldCode} onChange={(event) => setForm({ ...form, fieldCode: event.target.value })} className="admin-public-input" placeholder="مثلاً ۱۳۵۹" /></label>
                <label className="admin-extracted-managepubliccontent-40">نام رشته<input value={form.fieldName} onChange={(event) => setForm({ ...form, fieldName: event.target.value })} className="admin-public-input" placeholder="مثلاً پژوهش هنر" /></label>
                <label className="admin-extracted-managepubliccontent-41">تعداد کل سؤال‌های این کدرشته<input type="number" min="0" step="1" value={form.totalQuestions} onChange={(event) => { const raw = event.target.value; const total = Math.max(0, Math.floor(Number(raw) || 0)); setForm((current) => ({ ...current, totalQuestions: raw, questions: current.questions.slice(0, total).concat(Array.from({ length: Math.max(0, total - current.questions.length) }, (_, index) => ({ questionNumber: String(current.questions.length + index + 1), explanation: '', status: 'NOT_COVERED' as const }))) })); }} className="admin-public-input admin-public-input--ltr" placeholder="60" /></label>
                <label className="admin-extracted-managepubliccontent-42">شماره اولین سؤال در محاسبه<input type="number" min="1" max={Math.max(1, Number(form.totalQuestions) || 1)} step="1" value={form.startQuestionNumber} onChange={(event) => setForm({ ...form, startQuestionNumber: event.target.value })} className="admin-public-input admin-public-input--ltr" placeholder="مثلاً ۲۶" /><span style={{ color: colors.muted, lineHeight: 1.8 }}>سؤال‌های قبل از این شماره در درصد پوشش حساب نمی‌شوند.</span></label>
              </div>
              <div className="admin-extracted-managepubliccontent-43">
                <div><strong className="admin-extracted-managepubliccontent-44">جدول وضعیت پوشش سؤال‌ها</strong><p style={{ color: colors.muted, fontSize: 11, margin: '4px 0 0' }}>برای هر سؤال فقط وضعیت پوشش را انتخاب کن؛ درصد پوشش خودکار محاسبه می‌شود.</p></div>
                <div style={{ padding: '8px 12px', borderRadius: 10, background: colors.bg, border: '1px solid ' + colors.border, fontSize: 12, fontWeight: 800 }}>درصد پوشش محاسبه‌شده: {calculateCoverage(form.questions, Number(form.startQuestionNumber) || 1) == null ? '—' : `${calculateCoverage(form.questions, Number(form.startQuestionNumber) || 1)}٪`}</div>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid ' + colors.border, borderRadius: 12, background: colors.bg }}>
                <table className="admin-extracted-managepubliccontent-45">
                  <thead><tr style={{ background: colors.alt, textAlign: 'right' }}>{['شماره سؤال', 'وضعیت پوشش', 'توضیحات'].map((label) => <th key={label} style={{ padding: '11px 10px', borderBottom: '1px solid ' + colors.border, whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead>
                  <tbody>{form.questions.map((question, index) => <tr key={index}>
                    <td style={{ padding: 7, borderBottom: '1px solid ' + colors.border, width: 100 }}><input aria-label={`شماره سؤال ${index + 1}`} value={question.questionNumber} onChange={(event) => setForm((current) => ({ ...current, questions: current.questions.map((row, rowIndex) => rowIndex === index ? { ...row, questionNumber: event.target.value } : row) }))} className="admin-public-input admin-public-input--compact" /></td>
                    <td style={{ padding: 7, borderBottom: '1px solid ' + colors.border, width: 170 }}><select aria-label={`وضعیت پوشش سؤال ${index + 1}`} value={question.status} onChange={(event) => setForm((current) => ({ ...current, questions: current.questions.map((row, rowIndex) => rowIndex === index ? { ...row, status: event.target.value as QuestionRow['status'] } : row) }))} className="admin-public-input">{questionStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td>
                    <td style={{ padding: 7, borderBottom: '1px solid ' + colors.border, minWidth: 360 }}><textarea aria-label={`توضیحات سؤال ${index+1}`} value={question.explanation ?? ''} onChange={(event) => setForm((current) => ({ ...current, questions: current.questions.map((row, rowIndex) => rowIndex === index ? { ...row, explanation: event.target.value } : row) }))} rows={2} className="admin-public-input admin-public-input--textarea admin-public-input--wide" placeholder="هر توضیح لازم: مبحث، منبع، کتاب، استاد، صفحه و نکته‌های مرتبط..." /></td>
                  </tr>)}
                  {form.questions.length === 0 && <tr><td colSpan={3} style={{ padding: 18, textAlign: 'center', color: colors.muted }}>ابتدا تعداد کل سؤال‌ها را وارد کن تا ردیف‌ها ساخته شوند.</td></tr>}</tbody>
                </table>
              </div>
            </section>
            <label className="admin-extracted-managepubliccontent-46"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> انتشار در صفحه عمومی</label>
            <div className="admin-extracted-managepubliccontent-47"><button disabled={saving} type="submit" className="admin-public-button admin-public-button--primary"><Save size={15} />{saving ? 'در حال ذخیره...' : 'ذخیره تحلیل'}</button><button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="admin-public-button">انصراف</button></div>
          </form>}

          {filteredAnalyses.length === 0 ? <div style={{ padding: 30, textAlign: 'center', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, color: colors.muted }}>تحلیلی با این فیلترها پیدا نشد.</div> : filteredAnalyses.map((item) => (
            <article key={item.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.bg, display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div className="admin-extracted-managepubliccontent-48">
                <div className="admin-extracted-managepubliccontent-49">
                  <strong className="admin-extracted-managepubliccontent-50">{item.title}</strong>
                  <span className={`admin-public-publish-status${item.published ? ' is-published' : ' is-draft'}`}>{item.published ? 'منتشرشده' : 'پیش‌نویس'}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>{[item.examYear, item.examLevel].filter(Boolean).join(' · ') || 'بدون سال و مقطع'}</div>
                <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap' }}>{(() => { const structured = parseAnalysisContent(item.content); const preview = structured?.narrative?.trim() || (structured ? [structured.fieldName, structured.coveragePercent == null ? '' : `پوشش ${structured.coveragePercent}٪`, `${structured.questions?.length || 0} سؤال ثبت‌شده`].filter(Boolean).join(' · ') : item.content); return preview.length > 240 ? preview.slice(0, 240) + '…' : preview; })()}</p>
              </div>
              <div className="admin-extracted-managepubliccontent-51">
                <button type="button" onClick={() => startEdit(item)} className="admin-public-button"><Pencil size={14} /> ویرایش</button>
                <button type="button" onClick={() => void deleteAnalysis(item)} className="admin-public-button admin-public-button--danger"><Trash2 size={14} /> حذف</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
