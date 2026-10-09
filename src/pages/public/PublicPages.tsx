import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileText, Moon, Search, Sun, UserRound, ExternalLink, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';

type PublicCourse = {
  id: string;
  title: string;
  professor: string;
  level: string | null;
  description: string | null;
  term: string | null;
  category: string | null;
  startDate: string | null;
  schedule: string | null;
  price: string | number | null;
  coverImage: string | null;
};

type PublicRule = { title: string; subtitle?: string | null; content: string; updatedAt?: string | null };
type PublicAnalysis = {
  id: string;
  title: string;
  subtitle?: string | null;
  content: string;
  examYear?: string | null;
  examLevel?: string | null;
  resourceUrl?: string | null;
  updatedAt: string;
};

type ThemeColors = {
  dark: boolean; bg: string; surface: string; surfaceAlt: string; text: string;
  muted: string; border: string; accent: string; accentSoft: string;
};

function usePageColors(): ThemeColors {
  const dark = useStore((state) => state.theme === 'dark');
  return {
    dark,
    bg: dark ? '#050505' : '#f8fafc',
    surface: dark ? '#111116' : '#ffffff',
    surfaceAlt: dark ? '#191920' : '#f1f5f9',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#a1a1aa' : '#64748b',
    border: dark ? 'rgba(255,255,255,.1)' : '#e2e8f0',
    accent: '#6D001A',
    accentSoft: dark ? 'rgba(109,0,26,.28)' : 'rgba(109,0,26,.08)',
  };
}

function money(value: string | number | null) {
  if (value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

const primaryButton = (colors: ThemeColors): React.CSSProperties => ({
  border: 0, borderRadius: 12, padding: '12px 16px', background: colors.accent,
  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
});

const secondaryButton = (colors: ThemeColors): React.CSSProperties => ({
  border: `1px solid ${colors.border}`, borderRadius: 12, padding: '11px 14px',
  background: colors.surface, color: colors.text, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
});

function PageFrame({
  eyebrow, title, description, onBack, children,
}: {
  eyebrow: string; title: string; description: string; onBack: () => void; children: React.ReactNode;
}) {
  const colors = usePageColors();
  const toggleTheme = useStore((state) => state.toggleTheme);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, direction: 'rtl', fontFamily: 'system-ui, sans-serif', padding: 'clamp(16px, 3vw, 40px)', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '4px 0 22px', borderBottom: `1px solid ${colors.border}` }}>
          <button type="button" onClick={onBack} style={{ ...secondaryButton(colors), border: 0, background: 'transparent', paddingInline: 0 }}>
            <ArrowRight size={17} /> بازگشت به صفحه اصلی
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, overflow: 'hidden', background: colors.surfaceAlt, display: 'grid', placeItems: 'center', border: `1px solid ${colors.border}` }}>
              <img src="/logo.png" alt="شمسه" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>آکادمی شمسه</div>
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>آموزش تخصصی هنر و پژوهش هنر</div>
            </div>
          </div>
          <button type="button" aria-label="تغییر تم" onClick={toggleTheme} style={secondaryButton(colors)}>
            {colors.dark ? <Sun size={16} /> : <Moon size={16} />}
            {colors.dark ? 'حالت روشن' : 'حالت تاریک'}
          </button>
        </header>

        <section style={{ margin: '26px 0 24px', padding: 'clamp(22px, 4vw, 38px)', borderRadius: 24, background: colors.dark ? 'linear-gradient(125deg, rgba(109,0,26,.38), #111116 68%)' : 'linear-gradient(125deg, #fff, #f1f5f9)', border: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, color: colors.dark ? '#fda4af' : colors.accent, fontWeight: 900, letterSpacing: '.04em', marginBottom: 10 }}>{eyebrow}</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(25px, 4vw, 38px)', lineHeight: 1.5, fontWeight: 950, maxWidth: 800 }}>{title}</h1>
          <p style={{ color: colors.muted, margin: '10px 0 0', lineHeight: 2, fontSize: 14, maxWidth: 780 }}>{description}</p>
        </section>

        {children}
        <footer style={{ borderTop: `1px solid ${colors.border}`, marginTop: 40, padding: '18px 0 4px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: colors.muted, fontSize: 11 }}>
          <span>تمامی حقوق مادی و معنوی برای آکادمی شمسه محفوظ است.</span>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}

export function CourseCatalogPage({ onBack }: { onBack: () => void }) {
  const colors = usePageColors();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/public/courses');
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setError('دریافت فهرست دوره‌ها انجام نشد. اتصال به سرور را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCourses(); }, []);

  const levels = useMemo(() => Array.from(new Set(courses.map((course) => course.level).filter((value): value is string => Boolean(value)))), [courses]);
  const filtered = courses.filter((course) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || [course.title, course.professor, course.description ?? '', course.category ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery && (level === 'ALL' || course.level === level);
  });

  return (
    <PageFrame eyebrow="دوره‌های آموزشی شمسه" title="مسیر یادگیری خودت را آگاهانه انتخاب کن." description="دوره‌ها را بر اساس محتوا، استاد و مقطع بررسی کن. اطلاعات هر دوره پیش از ثبت‌نام در دسترس توست." onBack={onBack}>
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={17} color={colors.muted} style={{ position: 'absolute', right: 13, top: 14 }} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی نام دوره، استاد یا موضوع..." style={{ width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 14px', borderRadius: 11, border: `1px solid ${colors.border}`, background: colors.surfaceAlt, color: colors.text, fontSize: 12, outline: 'none' }} />
        </div>
        <select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="فیلتر مقطع" style={{ minWidth: 150, padding: '12px 14px', borderRadius: 11, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 12 }}>
          <option value="ALL">همه مقاطع</option>
          {levels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => { setQuery(''); setLevel('ALL'); }} style={secondaryButton(colors)}>پاک‌کردن فیلترها</button>
      </section>

      {loading ? <div style={{ padding: 42, textAlign: 'center', color: colors.muted }}>در حال دریافت دوره‌ها...</div>
        : error ? <div style={{ padding: 24, borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.surface, textAlign: 'center' }}><p style={{ color: colors.text }}>{error}</p><button type="button" onClick={() => void loadCourses()} style={primaryButton(colors)}><RefreshCw size={15} /> تلاش مجدد</button></div>
        : filtered.length === 0 ? <div style={{ padding: 42, textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, color: colors.muted }}>دوره‌ای با این مشخصات پیدا نشد.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 285px), 1fr))', gap: 18 }}>
          {filtered.map((course) => (
            <article key={course.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ aspectRatio: '16 / 8', background: colors.surfaceAlt, overflow: 'hidden', position: 'relative' }}>
                {course.coverImage ? <img src={course.coverImage} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: colors.muted }}><BookOpen size={38} strokeWidth={1.2} /></div>}
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {course.level && <span style={{ background: colors.accentSoft, color: colors.dark ? '#fda4af' : colors.accent, borderRadius: 999, padding: '5px 9px', fontSize: 10, fontWeight: 800 }}>{course.level}</span>}
                  {course.term && <span style={{ background: colors.surfaceAlt, color: colors.muted, borderRadius: 999, padding: '5px 9px', fontSize: 10 }}>{course.term}</span>}
                </div>
                <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.8, fontWeight: 900 }}>{course.title}</h2>
                <p style={{ color: colors.muted, margin: 0, fontSize: 12, lineHeight: 2, flex: 1 }}>{course.description || 'برای دریافت اطلاعات تکمیلی درباره محتوای این دوره، با مؤسسه تماس بگیرید.'}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}><UserRound size={16} color={colors.muted} /><span>{course.professor}</span></div>
                {course.startDate && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.muted }}><CalendarDays size={15} />شروع دوره: {course.startDate}</div>}
                {course.schedule && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.muted }}><CalendarDays size={15} />{course.schedule}</div>}
                {course.category && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.muted }}><CheckCircle2 size={15} />{course.category}</div>}
                {money(course.price) && <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, fontWeight: 900, fontSize: 13 }}>{money(course.price)}</div>}
                <div style={{ fontSize: 11, color: colors.muted }}>برای اطلاعات ثبت‌نام و شرایط دوره با مؤسسه هماهنگ کنید.</div>
              </div>
            </article>
          ))}
        </div>}
    </PageFrame>
  );
}

export function RulesPage({ onBack }: { onBack: () => void }) {
  const colors = usePageColors();
  const [rules, setRules] = useState<PublicRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/public/content/rules');
      if (!response.ok) throw new Error('load');
      setRules(await response.json());
    } catch {
      setError('دریافت قوانین انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadRules(); }, []);

  return (
    <PageFrame eyebrow="راهنمای هنرجویان" title={rules?.title || 'قوانین و مقررات آموزشی'} description={rules?.subtitle || 'برای تجربه آموزشی منظم و مؤثر، پیش از ثبت‌نام و شرکت در دوره‌ها این موارد را مطالعه کن.'} onBack={onBack}>
      <section style={{ border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: colors.surface, padding: '18px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText color={colors.dark ? '#fda4af' : colors.accent} size={19} />
          <div style={{ fontWeight: 900, fontSize: 14 }}>متن رسمی قوانین شمسه</div>
        </div>
        <div style={{ maxHeight: 'min(62vh, 720px)', minHeight: 260, overflowY: 'auto', padding: 'clamp(18px, 3vw, 30px)', lineHeight: 2.2, whiteSpace: 'pre-wrap', fontSize: 13 }}>
          {loading ? <span style={{ color: colors.muted }}>در حال دریافت قوانین...</span>
            : error ? <div><p style={{ color: colors.text }}>{error}</p><button type="button" onClick={() => void loadRules()} style={primaryButton(colors)}><RefreshCw size={15} /> تلاش مجدد</button></div>
            : rules?.content || 'هنوز قانونی ثبت نشده است.'}
        </div>
      </section>
    </PageFrame>
  );
}

export function ExamAnalysisPage({ onBack }: { onBack: () => void }) {
  const colors = usePageColors();
  const [analyses, setAnalyses] = useState<PublicAnalysis[]>([]);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('ALL');
  const [level, setLevel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalyses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/public/content/analyses');
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setAnalyses(Array.isArray(data) ? data : []);
    } catch {
      setError('دریافت تحلیل‌های کنکور انجام نشد. اتصال به سرور را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAnalyses(); }, []);

  const years = useMemo(() => Array.from(new Set(analyses.map((item) => item.examYear).filter((value): value is string => Boolean(value)))), [analyses]);
  const levels = useMemo(() => Array.from(new Set(analyses.map((item) => item.examLevel).filter((value): value is string => Boolean(value)))), [analyses]);
  const filtered = analyses.filter((item) => {
    const term = query.trim().toLocaleLowerCase();
    const matchesQuery = !term || [item.title, item.subtitle ?? '', item.content, item.examYear ?? '', item.examLevel ?? ''].some((value) => value.toLocaleLowerCase().includes(term));
    return matchesQuery && (year === 'ALL' || item.examYear === year) && (level === 'ALL' || item.examLevel === level);
  });

  return (
    <PageFrame eyebrow="آرشیو و تحلیل آزمون‌ها" title="کنکورهای گذشته را دقیق‌تر بشناس." description="تحلیل‌ها و مطالب منتشرشده توسط شمسه را بر اساس سال و مقطع پیدا کن و با دید روشن‌تری برای مطالعه برنامه‌ریزی کن." onBack={onBack}>
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={17} color={colors.muted} style={{ position: 'absolute', right: 13, top: 14 }} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی عنوان یا موضوع تحلیل..." style={{ width: '100%', boxSizing: 'border-box', padding: '12px 40px 12px 14px', borderRadius: 11, border: `1px solid ${colors.border}`, background: colors.surfaceAlt, color: colors.text, fontSize: 12 }} />
        </div>
        <select value={year} onChange={(event) => setYear(event.target.value)} aria-label="فیلتر سال کنکور" style={{ minWidth: 130, padding: 12, borderRadius: 11, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 12 }}>
          <option value="ALL">همه سال‌ها</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={level} onChange={(event) => setLevel(event.target.value)} aria-label="فیلتر مقطع" style={{ minWidth: 130, padding: 12, borderRadius: 11, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, fontSize: 12 }}>
          <option value="ALL">همه مقاطع</option>{levels.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </section>

      {loading ? <div style={{ padding: 42, textAlign: 'center', color: colors.muted }}>در حال دریافت تحلیل‌ها...</div>
        : error ? <div style={{ padding: 24, textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18 }}><p>{error}</p><button type="button" onClick={() => void loadAnalyses()} style={primaryButton(colors)}><RefreshCw size={15} /> تلاش مجدد</button></div>
        : filtered.length === 0 ? <div style={{ padding: 42, textAlign: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, color: colors.muted }}>هنوز تحلیلی برای نمایش منتشر نشده است.</div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18 }}>
          {filtered.map((item) => (
            <article key={item.id} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.muted, fontSize: 11 }}><CalendarDays size={15} />{[item.examYear, item.examLevel].filter(Boolean).join(' · ') || 'تحلیل کنکور'}</div>
              <h2 style={{ margin: 0, fontSize: 17, lineHeight: 1.8 }}>{item.title}</h2>
              {item.subtitle && <div style={{ color: colors.muted, fontSize: 12, lineHeight: 1.8 }}>{item.subtitle}</div>}
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 2.1, fontSize: 12, flex: 1 }}>{item.content}</p>
              {item.resourceUrl && <a href={item.resourceUrl} target="_blank" rel="noreferrer" style={{ ...primaryButton(colors), textDecoration: 'none' }}>مشاهده منبع یا فایل <ExternalLink size={15} /></a>}
            </article>
          ))}
        </div>}
    </PageFrame>
  );
}
