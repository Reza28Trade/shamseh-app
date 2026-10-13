import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowLeft, CalendarDays, CheckCircle2, FileText, Moon, Search, Sun, UserRound, ExternalLink, RefreshCw, GraduationCap, Clock3, BookOpen, ShieldCheck, CreditCard, ClipboardCheck, BookOpenCheck, Headphones } from 'lucide-react';
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
  academicYear?: number | null;
  classDays?: string[];
  classStartTime?: string | null;
  classEndTime?: string | null;
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
  const [selectedCourse, setSelectedCourse] = useState<PublicCourse | null>(null);

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
  const dayNames: Record<string, string> = { SATURDAY: 'شنبه', SUNDAY: 'یکشنبه', MONDAY: 'دوشنبه', TUESDAY: 'سه‌شنبه', WEDNESDAY: 'چهارشنبه', THURSDAY: 'پنجشنبه', FRIDAY: 'جمعه' };
  const filtered = courses.filter((course) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || [course.title, course.professor, course.description ?? '', course.category ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery && (level === 'ALL' || course.level === level);
  });

  return (
    <PageFrame eyebrow={selectedCourse ? "جزئیات دوره آموزشی" : "دوره‌های آموزشی شمسه"} title={selectedCourse ? selectedCourse.title : "مسیر یادگیری خودت را آگاهانه انتخاب کن."} description={selectedCourse ? "اطلاعات معرفی، محتوای دوره و جزئیات برگزاری را بررسی کن." : "دوره‌های آموزشی شمسه را بر اساس محتوا، استاد و مقطع بررسی کن و با اطلاعات روشن‌تری مسیر یادگیری خودت را انتخاب کن."} onBack={onBack}>
      {selectedCourse ? (
        <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 22, overflow: 'hidden' }}>
          <div style={{ aspectRatio: '16 / 6', maxHeight: 360, background: colors.surfaceAlt, overflow: 'hidden' }}>
            <img src={selectedCourse.coverImage || `/api/public/courses/${selectedCourse.id}/cover`} alt={selectedCourse.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
          </div>
          <div style={{ padding: 'clamp(20px, 4vw, 34px)' }}>
            <button type="button" onClick={() => setSelectedCourse(null)} style={{ ...secondaryButton(colors), marginBottom: 22 }}><ArrowRight size={16} /> بازگشت به فهرست دوره‌ها</button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {selectedCourse.level && <span style={{ background: colors.accentSoft, color: colors.dark ? '#fda4af' : colors.accent, borderRadius: 999, padding: '6px 11px', fontSize: 11, fontWeight: 800 }}><GraduationCap size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 5 }} />{selectedCourse.level === 'MASTER' ? 'کارشناسی ارشد' : selectedCourse.level === 'DOCTORATE' ? 'دکتری' : selectedCourse.level}</span>}
              {selectedCourse.term && <span style={{ background: colors.surfaceAlt, color: colors.muted, borderRadius: 999, padding: '6px 11px', fontSize: 11 }}>{selectedCourse.term}</span>}
              {selectedCourse.academicYear && <span style={{ background: colors.surfaceAlt, color: colors.muted, borderRadius: 999, padding: '6px 11px', fontSize: 11 }}>سال تحصیلی {new Intl.NumberFormat('fa-IR').format(selectedCourse.academicYear)}</span>}
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 'clamp(20px, 3vw, 28px)', lineHeight: 1.7, fontWeight: 900 }}>{selectedCourse.title}</h2>
            <p style={{ margin: '0 0 24px', color: colors.muted, lineHeight: 2.2, fontSize: 14, whiteSpace: 'pre-wrap' }}>{selectedCourse.description || 'توضیحات تکمیلی این دوره هنوز ثبت نشده است.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
              <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 11 }}><UserRound size={19} color={colors.accent} /><div><div style={{ color: colors.muted, fontSize: 11, marginBottom: 5 }}>استاد دوره</div><strong style={{ fontSize: 13 }}>{selectedCourse.professor}</strong></div></div>
              {selectedCourse.category && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 11 }}><BookOpen size={19} color={colors.accent} /><div><div style={{ color: colors.muted, fontSize: 11, marginBottom: 5 }}>حوزه آموزشی</div><strong style={{ fontSize: 13 }}>{selectedCourse.category}</strong></div></div>}
              {selectedCourse.startDate && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 11 }}><CalendarDays size={19} color={colors.accent} /><div><div style={{ color: colors.muted, fontSize: 11, marginBottom: 5 }}>تاریخ شروع</div><strong style={{ fontSize: 13 }}>{selectedCourse.startDate}</strong></div></div>}
              {selectedCourse.schedule && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 11 }}><Clock3 size={19} color={colors.accent} /><div><div style={{ color: colors.muted, fontSize: 11, marginBottom: 5 }}>برنامه برگزاری</div><strong style={{ fontSize: 13 }}>{selectedCourse.schedule}</strong></div></div>}
              {selectedCourse.classDays && selectedCourse.classDays.length > 0 && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14 }}><div style={{ color: colors.muted, fontSize: 11, marginBottom: 7 }}>روزهای کلاس</div><strong style={{ fontSize: 13 }}>{selectedCourse.classDays.map((day) => dayNames[day] || day).join('، ')}</strong></div>}
              {(selectedCourse.classStartTime || selectedCourse.classEndTime) && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14 }}><div style={{ color: colors.muted, fontSize: 11, marginBottom: 7 }}>ساعت کلاس</div><strong style={{ fontSize: 13 }}>{[selectedCourse.classStartTime, selectedCourse.classEndTime].filter(Boolean).join(' تا ')}</strong></div>}
              {money(selectedCourse.price) && <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: 14 }}><div style={{ color: colors.muted, fontSize: 11, marginBottom: 7 }}>شهریه دوره</div><strong style={{ fontSize: 16 }}>{money(selectedCourse.price)}</strong></div>}
            </div>
            <p style={{ margin: '22px 0 0', padding: 14, borderRadius: 12, background: colors.surfaceAlt, color: colors.muted, fontSize: 12, lineHeight: 2 }}>این صفحه برای معرفی و بررسی اطلاعات دوره است؛ در حال حاضر فرایند ثبت‌نام آنلاین در این بخش فعال نیست.</p>
          </div>
        </section>
      ) : <>
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
                <img src={course.coverImage || `/api/public/courses/${course.id}/cover`} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
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
                <button type="button" onClick={() => setSelectedCourse(course)} style={{ ...primaryButton(colors), width: '100%', marginTop: 4 }}>مشاهده جزئیات دوره <ArrowLeft size={15} /></button>
              </div>
            </article>
          ))}
        </div>}
      </>}
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

  const paragraphs = useMemo(
    () => (rules?.content || '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
    [rules?.content],
  );

  const topics = [
    { icon: CreditCard, title: 'شهریه و پرداخت', description: 'شرایط پرداخت و زمان‌بندی اقساط را پیش از ثبت‌نام مرور کنید.' },
    { icon: ClipboardCheck, title: 'آزمون‌های آزمایشی', description: 'جزئیات مراحل آزمون و شرایط استفاده از خدمات آموزشی را بررسی کنید.' },
    { icon: Headphones, title: 'مشاوره تحصیلی', description: 'با شرایط استفاده از خدمات مشاوره آشنا شوید.' },
    { icon: BookOpenCheck, title: 'منابع آموزشی', description: 'اطلاعات کتاب‌ها، جزوه‌ها و منابع تکمیلی را بخوانید.' },
  ];

  return (
    <PageFrame eyebrow="راهنمای هنرجویان" title={rules?.title || 'قوانین و مقررات آموزشی'} description={rules?.subtitle || 'اطلاعات ضروری برای شروع یک مسیر آموزشی شفاف؛ پیش از ثبت‌نام، شرایط دوره و خدمات را با دقت مطالعه کنید.'} onBack={onBack}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 225px), 1fr))', gap: 12, marginBottom: 22 }}>
        {topics.map(({ icon: Icon, title: topicTitle, description }) => (
          <article key={topicTitle} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 18, padding: 18, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 42, height: 42, flex: '0 0 42px', display: 'grid', placeItems: 'center', borderRadius: 13, background: colors.accentSoft, color: colors.dark ? '#fda4af' : colors.accent }}>
              <Icon size={20} />
            </div>
            <div>
              <h2 style={{ margin: '1px 0 6px', fontSize: 13, fontWeight: 900 }}>{topicTitle}</h2>
              <p style={{ margin: 0, color: colors.muted, fontSize: 11, lineHeight: 1.9 }}>{description}</p>
            </div>
          </article>
        ))}
      </section>

      <section style={{ border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: 22, overflow: 'hidden', boxShadow: colors.dark ? '0 16px 45px rgba(0,0,0,.18)' : '0 16px 45px rgba(15,23,42,.045)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: colors.surface, padding: '17px clamp(16px, 3vw, 26px)', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: colors.accentSoft, color: colors.dark ? '#fda4af' : colors.accent }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>متن قوانین و مقررات</div>
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>لطفاً تمام بخش‌ها را مطالعه کنید</div>
            </div>
          </div>
          {rules?.updatedAt && <span style={{ color: colors.muted, fontSize: 10 }}>آخرین به‌روزرسانی: {new Date(rules.updatedAt).toLocaleDateString('fa-IR')}</span>}
        </div>

        <div style={{ maxHeight: 'min(68vh, 820px)', minHeight: 280, overflowY: 'auto', padding: 'clamp(16px, 3vw, 30px)' }}>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: colors.muted }}>در حال دریافت قوانین...</div>
            : error ? <div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: colors.text }}>{error}</p><button type="button" onClick={() => void loadRules()} style={primaryButton(colors)}><RefreshCw size={15} /> تلاش مجدد</button></div>
            : !paragraphs.length ? <div style={{ padding: 36, textAlign: 'center', color: colors.muted }}>هنوز قانونی ثبت نشده است.</div>
            : <div style={{ display: 'grid', gap: 12 }}>
              {paragraphs.map((paragraph, index) => {
                const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
                const firstLine = lines[0] || '';
                const isHeading = lines.length === 1 && (firstLine.length < 90) && (/^(\d+[.\-ـ]|بخش\s|فصل\s|شرایط\s|قوانین\s|تبصره|توجه:|نکته:|.*:)$/.test(firstLine) || firstLine.startsWith('#'));
                return (
                  <article key={index} style={{ border: `1px solid ${colors.border}`, borderRadius: 15, padding: '15px clamp(14px, 2.5vw, 22px)', background: isHeading ? colors.surfaceAlt : 'transparent', borderRight: isHeading ? `3px solid ${colors.accent}` : `1px solid ${colors.border}` }}>
                    {isHeading ? <h3 style={{ margin: 0, fontSize: 13, lineHeight: 1.9, fontWeight: 900, color: colors.text }}>{firstLine.replace(/^#+\s*/, '')}</h3>
                      : <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 2.15, fontSize: 13, color: colors.text }}>{paragraph}</p>}
                  </article>
                );
              })}
            </div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px clamp(16px, 3vw, 26px)', borderTop: `1px solid ${colors.border}`, background: colors.surfaceAlt, color: colors.muted, fontSize: 11, lineHeight: 1.9 }}>
          <FileText size={16} style={{ flex: '0 0 auto', marginTop: 2 }} />
          <span>برای اطلاع از جزئیات اختصاصی هر دوره، برنامه آموزشی و اطلاعیه‌های همان دوره را نیز بررسی کنید.</span>
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
