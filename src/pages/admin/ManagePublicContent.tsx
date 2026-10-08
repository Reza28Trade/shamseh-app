import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenText, Check, Eye, EyeOff, FileText, Pencil, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

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

type AnalysisForm = {
  title: string; subtitle: string; content: string; examYear: string;
  examLevel: string; resourceUrl: string; published: boolean; sortOrder: string;
};

const emptyAnalysis: AnalysisForm = {
  title: '', subtitle: '', content: '', examYear: '', examLevel: '',
  resourceUrl: '', published: false, sortOrder: '0',
};

export const ManagePublicContent: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const dark = theme === 'dark';
  const colors = {
    bg: dark ? '#111116' : '#ffffff',
    alt: dark ? '#191920' : '#f1f5f9',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#94a3b8' : '#64748b',
    border: dark ? 'rgba(255,255,255,.1)' : '#e2e8f0',
    accent: '#6D001A',
  };
  const [tab, setTab] = useState<'rules' | 'analysis'>('rules');
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [rulesTitle, setRulesTitle] = useState('قوانین و مقررات آموزشی');
  const [rulesText, setRulesText] = useState('');
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
      const rules = Array.isArray(data) ? data.find((item) => item.type === 'RULES') : undefined;
      setRulesTitle(rules?.title || 'قوانین و مقررات آموزشی');
      setRulesText(rules?.content || '');
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

  const saveRules = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/public-content/rules', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: rulesTitle.trim(), content: rulesText }),
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
    setForm({
      title: item.title, subtitle: item.subtitle || '', content: item.content,
      examYear: item.examYear || '', examLevel: item.examLevel || '',
      resourceUrl: item.resourceUrl || '', published: item.published,
      sortOrder: String(item.sortOrder ?? 0),
    });
    setShowForm(true); setError(''); setSuccess('');
  };

  const saveAnalysis = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setError('عنوان و متن تحلیل الزامی است.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle.trim() || undefined,
      content: form.content, examYear: form.examYear.trim() || undefined,
      examLevel: form.examLevel.trim() || undefined, resourceUrl: form.resourceUrl.trim() || undefined,
      published: form.published, sortOrder: Math.max(0, Number(form.sortOrder) || 0),
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

  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.alt, color: colors.text, fontSize: 12, outline: 'none' };
  const buttonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 13px', background: colors.bg, color: colors.text, fontSize: 12, fontWeight: 800, cursor: 'pointer' };

  return (
    <div style={{ color: colors.text, display: 'flex', flexDirection: 'column', gap: 18, width: '100%', minWidth: 0 }}>
      <header style={{ padding: '24px', borderRadius: 18, background: dark ? 'linear-gradient(120deg, rgba(109,0,26,.28), #111116)' : 'linear-gradient(120deg, #fff, #f1f5f9)', border: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><BookOpenText size={21} color={dark ? '#fda4af' : colors.accent} /><h2 style={{ fontSize: 19, margin: 0, fontWeight: 900 }}>مدیریت محتوای عمومی</h2></div>
        <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.9, margin: 0 }}>قوانین و تحلیل کنکورهایی که در صفحه اصلی برای هنرجویان نمایش داده می‌شوند را از این بخش مدیریت کنید.</p>
      </header>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { setTab('rules'); setError(''); }} style={{ ...buttonStyle, background: tab === 'rules' ? colors.accent : colors.bg, color: tab === 'rules' ? '#fff' : colors.text }}><FileText size={15} /> قوانین و مقررات</button>
        <button type="button" onClick={() => { setTab('analysis'); setError(''); }} style={{ ...buttonStyle, background: tab === 'analysis' ? colors.accent : colors.bg, color: tab === 'analysis' ? '#fff' : colors.text }}><BookOpenText size={15} /> تحلیل کنکور سال‌های قبل</button>
      </div>

      {error && <div role="alert" style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 12 }}>{error}</div>}
      {success && <div role="status" style={{ padding: 12, borderRadius: 10, background: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 12 }}>{success}</div>}
      {loading ? <div style={{ padding: 32, textAlign: 'center', color: colors.muted }}>در حال دریافت اطلاعات...</div> : tab === 'rules' ? (
        <form onSubmit={saveRules} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 26px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800 }}>عنوان صفحه قوانین
            <input required value={rulesTitle} onChange={(event) => setRulesTitle(event.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, fontWeight: 800 }}>متن قوانین
            <textarea required value={rulesText} onChange={(event) => setRulesText(event.target.value)} rows={16} style={{ ...inputStyle, minHeight: 300, lineHeight: 2, resize: 'vertical' }} placeholder="هر قانون را در یک خط یا پاراگراف جدا وارد کنید." />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} style={{ ...buttonStyle, background: colors.accent, color: '#fff', borderColor: colors.accent, opacity: saving ? .7 : 1 }}><Save size={15} />{saving ? 'در حال ذخیره...' : 'ذخیره و انتشار قوانین'}</button>
            <span style={{ color: colors.muted, fontSize: 11 }}>ذخیره در پایگاه داده؛ قابل مشاهده برای همه بازدیدکنندگان.</span>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 14, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16 }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}><Search size={15} color={colors.muted} style={{ position: 'absolute', right: 11, top: 13 }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی عنوان، سال یا متن..." style={{ ...inputStyle, paddingRight: 34 }} /></div>
            <select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)} style={inputStyle}><option value="ALL">همه سال‌ها</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select value={publishFilter} onChange={(event) => setPublishFilter(event.target.value)} style={inputStyle}><option value="ALL">همه وضعیت‌ها</option><option value="true">منتشرشده</option><option value="false">پیش‌نویس</option></select>
            <button type="button" onClick={startCreate} style={{ ...buttonStyle, background: colors.accent, color: '#fff', borderColor: colors.accent }}><Plus size={15} /> افزودن تحلیل</button>
          </div>

          {showForm && <form onSubmit={saveAnalysis} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>{editingId ? 'ویرایش تحلیل' : 'ثبت تحلیل جدید'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>عنوان *<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={inputStyle} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>سال کنکور<input value={form.examYear} onChange={(event) => setForm({ ...form, examYear: event.target.value })} style={inputStyle} placeholder="مثلاً ۱۴۰۵" /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>مقطع<input value={form.examLevel} onChange={(event) => setForm({ ...form, examLevel: event.target.value })} style={inputStyle} placeholder="ارشد یا دکتری" /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>زیرعنوان<input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} style={inputStyle} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>لینک منبع یا فایل<input value={form.resourceUrl} onChange={(event) => setForm({ ...form, resourceUrl: event.target.value })} style={inputStyle} placeholder="https://..." /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>ترتیب نمایش<input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} style={inputStyle} /></label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>متن تحلیل *<textarea required rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} style={{ ...inputStyle, lineHeight: 2, resize: 'vertical' }} /></label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> انتشار در صفحه عمومی</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button disabled={saving} type="submit" style={{ ...buttonStyle, background: colors.accent, color: '#fff', borderColor: colors.accent }}><Save size={15} />{saving ? 'در حال ذخیره...' : 'ذخیره تحلیل'}</button><button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={buttonStyle}>انصراف</button></div>
          </form>}

          {filteredAnalyses.length === 0 ? <div style={{ padding: 30, textAlign: 'center', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 16, color: colors.muted }}>تحلیلی با این فیلترها پیدا نشد.</div> : filteredAnalyses.map((item) => (
            <article key={item.id} style={{ padding: 18, borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.bg, display: 'flex', gap: 14, justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
                  <strong style={{ fontSize: 14 }}>{item.title}</strong>
                  <span style={{ fontSize: 10, padding: '4px 7px', borderRadius: 999, background: item.published ? 'rgba(16,185,129,.12)' : colors.alt, color: item.published ? '#10b981' : colors.muted }}>{item.published ? 'منتشرشده' : 'پیش‌نویس'}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>{[item.examYear, item.examLevel].filter(Boolean).join(' · ') || 'بدون سال و مقطع'}</div>
                <p style={{ color: colors.muted, fontSize: 12, lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap' }}>{item.content.length > 240 ? item.content.slice(0, 240) + '…' : item.content}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => startEdit(item)} style={buttonStyle}><Pencil size={14} /> ویرایش</button>
                <button type="button" onClick={() => void deleteAnalysis(item)} style={{ ...buttonStyle, color: '#ef4444' }}><Trash2 size={14} /> حذف</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
