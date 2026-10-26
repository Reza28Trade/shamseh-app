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
type PublicBook = { id: string; title: string; description?: string | null; coverImage?: string | null; category?: string | null; price?: string | number | null; discountedPrice?: string | number | null; availableQuantity: number };
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
    bg: dark ? 'radial-gradient(ellipse at 12% 0%, rgba(46,177,178,.22), transparent 34%), radial-gradient(ellipse at 88% 16%, rgba(61,44,92,.17), transparent 30%), #08080c' : 'radial-gradient(ellipse at 12% 0%, rgba(46,177,178,.13), transparent 34%), radial-gradient(ellipse at 88% 16%, rgba(46,177,178,.08), transparent 30%), #f2f9f9',
    surface: dark ? '#11191c' : '#ffffff',
    surfaceAlt: dark ? '#17272b' : '#eaf7f7',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? '#a1a1aa' : '#64748b',
    border: dark ? 'rgba(219,190,137,.16)' : 'rgba(46,177,178,.14)',
    accent: '#168C91',
    accentSoft: dark ? 'rgba(46,177,178,.2)' : 'rgba(46,177,178,.08)',
  };
}

function money(value: string | number | null) {
  if (value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

const primaryButton = (colors: ThemeColors): React.CSSProperties => ({
  border: 0, borderRadius: 12, padding: '12px 16px', background: colors.dark ? 'linear-gradient(125deg, #22A6A1 0%, #168C91 48%, #102F3D 100%)' : 'linear-gradient(125deg, #51C4BB 0%, #168C91 52%, #126B72 100%)',
  color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer',
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

        <section style={{ margin: '26px 0 24px', padding: 'clamp(22px, 4vw, 38px)', borderRadius: 24, background: colors.dark ? 'radial-gradient(circle at 88% 0%, rgba(101,177,235,.17), transparent 30%), radial-gradient(circle at 12% 100%, rgba(18,60,120,.38), transparent 42%), linear-gradient(125deg, #102f38, #11191c 68%, #171523)' : 'radial-gradient(circle at 88% 0%, rgba(46,177,178,.2), transparent 30%), radial-gradient(circle at 12% 100%, rgba(30,99,181,.09), transparent 42%), linear-gradient(125deg, #f9ffff, #e7f5f5 56%, #eaf7f7)', border: `1px solid ${colors.dark ? 'rgba(101,177,235,.22)' : 'rgba(109,0,26,.13)'}`, position: 'relative', overflow: 'hidden', boxShadow: colors.dark ? '0 20px 60px rgba(0,0,0,.2)' : '0 20px 60px rgba(76,37,37,.07)' }}>
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
  const levelLabel = (value: string) => value === 'MASTER' ? 'کارشناسی ارشد' : value === 'DOCTORATE' ? 'دکتری' : value === 'UNDERGRADUATE' ? 'کارشناسی' : value;
  const courseImageMap = useMemo(() => {
    const ordered = [...courses].sort((a, b) =>
      `${a.level ?? ''}|${a.title}|${a.professor}|${a.startDate ?? ''}`.localeCompare(
        `${b.level ?? ''}|${b.title}|${b.professor}|${b.startDate ?? ''}`,
        'fa',
      ),
    );
    return new Map(ordered.map((course, index) => [
      course.id,
      index < 22 ? `/course-images/course-${String(index + 1).padStart(2, '0')}.jpg` : null,
    ]));
  }, [courses]);
  const courseImage = (course: PublicCourse) =>
    course.coverImage || courseImageMap.get(course.id) || `/api/public/courses/${course.id}/cover`;
  const dayNames: Record<string, string> = { SATURDAY: 'شنبه', SUNDAY: 'یکشنبه', MONDAY: 'دوشنبه', TUESDAY: 'سه‌شنبه', WEDNESDAY: 'چهارشنبه', THURSDAY: 'پنجشنبه', FRIDAY: 'جمعه' };
  const filtered = courses.filter((course) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || [course.title, course.professor, course.description ?? '', course.category ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    return matchesQuery && (level === 'ALL' || course.level === level);
  });

  return (
    <PageFrame eyebrow={selectedCourse ? "جزئیات دوره آموزشی" : "دوره‌های آموزشی شمسه"} title={selectedCourse ? selectedCourse.title : "مسیر یادگیری خودت را آگاهانه انتخاب کن."} description={selectedCourse ? "اطلاعات معرفی، محتوای دوره و جزئیات برگزاری را بررسی کن." : "دوره‌های آموزشی شمسه را بر اساس محتوا، استاد و مقطع بررسی کن و با اطلاعات روشن‌تری مسیر یادگیری خودت را انتخاب کن."} onBack={onBack}>
      {selectedCourse ? (
        <section style={{ background: colors.dark ? 'linear-gradient(145deg, #10272c, #11191c 70%)' : 'linear-gradient(145deg, #fbfdff, #f2f9f9 70%)', border: `1px solid ${colors.border}`, borderRadius: 22, overflow: 'hidden' }}>
          <div style={{ width: '100%', minWidth: 0, display: 'block', aspectRatio: '16 / 9', maxHeight: 360, background: colors.surfaceAlt, overflow: 'hidden' }}>
            <img src={courseImage(selectedCourse)} alt={selectedCourse.title} style={{ display: 'block', width: '100%', minWidth: 0, height: '100%', objectFit: 'cover' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
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
      <section style={{ background: colors.dark ? 'linear-gradient(120deg, #10272c, #11191c)' : 'linear-gradient(120deg, #fbfdff, #eaf7f7)', border: `1px solid ${colors.border}`, borderRadius: 20, padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
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
            <article key={course.id} style={{ background: colors.dark ? 'linear-gradient(145deg, #10272c, #11191c 75%)' : 'linear-gradient(145deg, #fbfdff, #eef5fd 85%)', border: `1px solid ${colors.border}`, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: colors.dark ? '0 12px 34px rgba(0,0,0,.15)' : '0 12px 34px rgba(76,37,37,.045)' }}>
              <div style={{ width: '100%', minWidth: 0, display: 'block', aspectRatio: '16 / 9', background: colors.surfaceAlt, overflow: 'hidden', position: 'relative' }}>
                <img src={courseImage(course)} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {course.level && <span style={{ background: colors.accentSoft, color: colors.dark ? '#fda4af' : colors.accent, borderRadius: 999, padding: '5px 9px', fontSize: 10, fontWeight: 800 }}>{levelLabel(course.level)}</span>}
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
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');

  const loadBooks = async () => {
    setBooksLoading(true);
    setBooksError('');
    try {
      const response = await fetch('/api/public/books');
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch {
      setBooksError('دریافت فهرست کتاب‌ها انجام نشد. لطفاً دوباره تلاش کنید.');
    } finally {
      setBooksLoading(false);
    }
  };

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

  useEffect(() => { void loadRules(); void loadBooks(); }, []);

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
    <PageFrame eyebrow="راهنمای هنرجویان" title={rules?.title || 'قوانین و مقررات آموزشی آکادمی شمسه'} description={rules?.subtitle || 'راهنمای شفاف خدمات آموزشی شمسه؛ برای شروعی مطمئن، شرایط را با آرامش مرور کنید.'} onBack={onBack}>
      <section style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(180px, .7fr)', gap: 24, alignItems: 'center', marginBottom: 24, padding: 'clamp(22px, 4vw, 38px)', borderRadius: 26, border: `1px solid ${colors.dark ? 'rgba(101,177,235,.28)' : 'rgba(30,99,181,.2)'}`, background: colors.dark ? 'radial-gradient(circle at 12% 10%, rgba(101,177,235,.13), transparent 35%), linear-gradient(125deg, #10272c, #100f12 72%)' : 'radial-gradient(circle at 12% 10%, rgba(101,177,235,.16), transparent 36%), linear-gradient(125deg, #f9ffff, #e7f5f5 72%)', boxShadow: colors.dark ? '0 22px 60px rgba(0,0,0,.2)' : '0 22px 60px rgba(69,49,20,.07)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 999, border: `1px solid ${colors.dark ? 'rgba(101,177,235,.3)' : 'rgba(30,99,181,.23)'}`, color: colors.dark ? '#8be0d5' : '#22A6A1', fontSize: 11, fontWeight: 900, marginBottom: 15 }}>
            <ShieldCheck size={15} /> منشور رسمی آکادمی شمسه
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 'clamp(19px, 3vw, 27px)', lineHeight: 1.8, fontWeight: 950, color: colors.text }}>شفافیت، آغاز یک تجربه آموزشی مطمئن</h2>
          <p style={{ margin: 0, maxWidth: 650, color: colors.muted, fontSize: 13, lineHeight: 2.2 }}>شرایط ثبت‌نام، پرداخت شهریه و استفاده از خدمات آموزشی را در بخش‌های زیر مرور کنید. این راهنما برای دسترسی آسان‌تر و تصمیم‌گیری آگاهانه شما طراحی شده است.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', justifyItems: 'center', gap: 12, padding: 18, borderRadius: 22, background: colors.dark ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.56)', border: `1px solid ${colors.dark ? 'rgba(255,255,255,.08)' : 'rgba(46,177,178,.14)'}` }}>
          <div style={{ width: 74, height: 74, borderRadius: 24, display: 'grid', placeItems: 'center', color: '#65B1EB', background: 'linear-gradient(145deg, rgba(101,177,235,.18), rgba(101,177,235,.04))', border: '1px solid rgba(101,177,235,.35)', boxShadow: '0 10px 30px rgba(0,0,0,.08)' }}><ShieldCheck size={35} strokeWidth={1.5} /></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: colors.text, fontWeight: 900, fontSize: 13 }}>راهنمای آموزشی</div>
            <div style={{ color: colors.muted, fontSize: 10, marginTop: 5 }}>مطالعه پیش از ثبت‌نام</div>
          </div>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', left: -45, bottom: -90, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(101,177,235,.12)', boxShadow: '0 0 0 22px rgba(101,177,235,.025), 0 0 0 44px rgba(101,177,235,.02)', zIndex: 0 }} />
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 225px), 1fr))', gap: 14, marginBottom: 26 }}>
        {topics.map(({ icon: Icon, title: topicTitle, description }) => (
          <article key={topicTitle} style={{ position: 'relative', overflow: 'hidden', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 19, padding: 19, display: 'flex', alignItems: 'flex-start', gap: 13, minHeight: 112, boxShadow: colors.dark ? '0 8px 24px rgba(0,0,0,.08)' : '0 8px 24px rgba(15,23,42,.035)', transition: 'transform .2s ease, border-color .2s ease' }}>
            <div style={{ width: 46, height: 46, flex: '0 0 46px', display: 'grid', placeItems: 'center', borderRadius: 15, background: 'linear-gradient(145deg, rgba(46,177,178,.2), rgba(101,177,235,.06))', border: '1px solid rgba(101,177,235,.22)', color: colors.dark ? '#8be0d5' : '#22A6A1' }}>
              <Icon size={21} strokeWidth={1.7} />
            </div>
            <div style={{ minWidth: 0, paddingTop: 2 }}>
              <h2 style={{ margin: '1px 0 7px', fontSize: 13, fontWeight: 900, lineHeight: 1.8 }}>{topicTitle}</h2>
              <p style={{ margin: 0, color: colors.muted, fontSize: 11, lineHeight: 2 }}>{description}</p>
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: -26, bottom: -38, width: 90, height: 90, borderRadius: '50%', border: '1px solid rgba(101,177,235,.1)' }} />
          </article>
        ))}
      </section>

      <section style={{ border: `1px solid ${colors.dark ? 'rgba(46,177,178,.2)' : 'rgba(30,99,181,.17)'}`, background: colors.surface, borderRadius: 24, overflow: 'hidden', boxShadow: colors.dark ? '0 22px 55px rgba(0,0,0,.22)' : '0 22px 55px rgba(69,49,20,.055)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: colors.dark ? 'linear-gradient(110deg, #10272c, #11191c)' : 'linear-gradient(110deg, #f9ffff, #ffffff)', padding: '19px clamp(16px, 3vw, 28px)', borderBottom: `1px solid ${colors.dark ? 'rgba(46,177,178,.2)' : 'rgba(46,177,178,.16)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, rgba(46,177,178,.2), rgba(46,177,178,.05))', border: '1px solid rgba(101,177,235,.25)', color: colors.dark ? '#8be0d5' : '#22A6A1' }}>
              <ShieldCheck size={23} strokeWidth={1.7} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14 }}>متن قوانین و مقررات</div>
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>لطفاً تمام بخش‌ها را مطالعه کنید</div>
            </div>
          </div>
          {rules?.updatedAt && <span style={{ color: colors.muted, fontSize: 10 }}>آخرین به‌روزرسانی: {new Date(rules.updatedAt).toLocaleDateString('fa-IR')}</span>}
        </div>

        <div className="shamseh-rules-scroll" style={{ maxHeight: 'min(68vh, 820px)', minHeight: 280, overflowY: 'auto', overscrollBehaviorY: 'contain', scrollBehavior: 'smooth', scrollbarWidth: 'thin', scrollbarColor: colors.dark ? '#a88a50 rgba(255,255,255,.06)' : '#b89a61 #e7f5f5', padding: 'clamp(16px, 3vw, 30px)' }}>
          <style>{`
            .shamseh-rules-scroll::-webkit-scrollbar { width: 10px; }
            .shamseh-rules-scroll::-webkit-scrollbar-track { background: ${colors.dark ? '#17171b' : '#e7f5f5'}; border-radius: 999px; margin-block: 12px; }
            .shamseh-rules-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #8be0d5, #168C91); border: 3px solid ${colors.dark ? '#17171b' : '#e7f5f5'}; border-radius: 999px; }
            .shamseh-rules-scroll::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, #a8eee5, #22A6A1); }
            @media (max-width: 640px) { .shamseh-rules-scroll { maxHeight: none !important; min-height: 0 !important; overflow: visible !important; } }
          `}</style>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: colors.muted }}>در حال دریافت قوانین...</div>
            : error ? <div style={{ padding: 24, textAlign: 'center' }}><p style={{ color: colors.text }}>{error}</p><button type="button" onClick={() => void loadRules()} style={primaryButton(colors)}><RefreshCw size={15} /> تلاش مجدد</button></div>
            : !paragraphs.length ? <div style={{ padding: 36, textAlign: 'center', color: colors.muted }}>هنوز قانونی ثبت نشده است.</div>
            : <div style={{ display: 'grid', gap: 12 }}>
              {paragraphs.map((paragraph, index) => {
                const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
                const firstLine = lines[0] || '';
                const isHeading = lines.length === 1 && (firstLine.length < 90) && (/^(\d+[.\-ـ]|بخش\s|فصل\s|شرایط\s|قوانین\s|تبصره|توجه:|نکته:|.*:)$/.test(firstLine) || firstLine.startsWith('#'));
                return (
                  <article key={index} style={{ border: `1px solid ${isHeading ? (colors.dark ? 'rgba(101,177,235,.22)' : 'rgba(30,99,181,.16)') : colors.border}`, borderRadius: 16, padding: '17px clamp(14px, 2.5vw, 24px)', background: isHeading ? (colors.dark ? 'linear-gradient(110deg, rgba(101,177,235,.09), rgba(255,255,255,.015))' : 'linear-gradient(110deg, #eaf7f7, #f9ffff)') : (colors.dark ? 'rgba(255,255,255,.018)' : 'white'), borderRight: isHeading ? '3px solid #65B1EB' : `1px solid ${colors.border}`, boxShadow: isHeading ? 'none' : (colors.dark ? '0 4px 14px rgba(0,0,0,.06)' : '0 4px 14px rgba(15,23,42,.025)') }}>
                    {isHeading ? <h3 style={{ margin: 0, fontSize: 13, lineHeight: 1.9, fontWeight: 950, color: colors.text }}>{firstLine.replace(/^#+\s*/, '')}</h3>
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

      <section aria-labelledby="shamseh-books-heading" style={{ marginTop: 26, border: `1px solid ${colors.border}`, background: colors.surface, borderRadius: 22, padding: 'clamp(18px, 3vw, 28px)', boxShadow: colors.dark ? '0 16px 38px rgba(0,0,0,.14)' : '0 16px 38px rgba(15,23,42,.035)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, display: 'grid', placeItems: 'center', color: colors.accent, background: colors.accentSoft, border: `1px solid ${colors.border}` }}><BookOpen size={21} /></div>
            <div>
              <h2 id="shamseh-books-heading" style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>کتاب‌ها و منابع آموزشی</h2>
              <p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.9 }}>کتاب‌های فعال فروشگاه شمسه، مستقیماً از فهرست مدیریت نمایش داده می‌شوند.</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadBooks()} style={secondaryButton(colors)}><RefreshCw size={14} /> تازه‌سازی فهرست</button>
        </div>
        {booksLoading ? <p style={{ color: colors.muted, fontSize: 12, padding: 12 }}>در حال دریافت منابع آموزشی…</p>
          : booksError ? <div role="alert" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><p style={{ color: colors.text, fontSize: 12 }}>{booksError}</p><button type="button" onClick={() => void loadBooks()} style={primaryButton(colors)}>تلاش مجدد</button></div>
          : books.length === 0 ? <div style={{ padding: '22px 12px', textAlign: 'center', color: colors.muted, border: `1px dashed ${colors.border}`, borderRadius: 14, fontSize: 12 }}>در حال حاضر کتاب فعالی برای نمایش ثبت نشده است.</div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 }}>
            {books.map((book) => (
              <article key={book.id} style={{ display: 'grid', alignContent: 'start', gap: 10, minWidth: 0, padding: 13, borderRadius: 15, border: `1px solid ${colors.border}`, background: colors.dark ? 'rgba(255,255,255,.018)' : '#fff' }}>
                <div style={{ height: 170, display: 'grid', placeItems: 'center', overflow: 'hidden', borderRadius: 11, background: colors.surfaceAlt, border: `1px solid ${colors.border}` }}>
                  {book.coverImage ? <img src={book.coverImage} alt={`جلد ${book.title}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <BookOpen size={36} color={colors.muted} strokeWidth={1.3} />}
                </div>
                {book.category && <span style={{ color: colors.accent, fontSize: 10, fontWeight: 800 }}>{book.category}</span>}
                <h3 style={{ margin: 0, fontSize: 13, lineHeight: 1.9, fontWeight: 900 }}>{book.title}</h3>
                {book.description && <p style={{ margin: 0, color: colors.muted, fontSize: 11, lineHeight: 1.9, overflowWrap: 'anywhere' }}>{book.description}</p>}
                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 12 }}>{money(book.discountedPrice ?? book.price ?? null) || 'قیمت اعلام نشده'}</strong>
                  <span style={{ fontSize: 10, color: book.availableQuantity > 0 ? colors.muted : '#c45b5b' }}>{book.availableQuantity > 0 ? `موجود: ${book.availableQuantity.toLocaleString('fa-IR')}` : 'ناموجود'}</span>
                </div>
              </article>
            ))}
          </div>}
      </section>
    </PageFrame>
  );
}

export function ExamAnalysisPage({ onBack }: { onBack: () => void }) {
  const colors = usePageColors();
  const [analyses, setAnalyses] = useState<PublicAnalysis[]>([]);
  const [year, setYear] = useState('');
  const [selected, setSelected] = useState<PublicAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  type AnalysisQuestion = { questionNumber: string; explanation?: string; topic?: string; className?: string; professor?: string; source?: string; page?: string; status?: string };
  type StructuredAnalysis = { __shamsehExamAnalysis: 1; narrative?: string; fieldCode?: string; fieldName?: string; examLevel?: string; startQuestionNumber?: number | string; questions?: AnalysisQuestion[] };

  const loadAnalyses = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/public/content/analyses');
      if (!response.ok) throw new Error('load');
      const data = await response.json();
      setAnalyses(Array.isArray(data) ? data : []);
    } catch { setError('دریافت تحلیل‌های کنکور انجام نشد. اتصال به سرور را بررسی کنید.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadAnalyses(); }, []);

  const normalizeDigits = (value: unknown) => String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  const numberValue = (value: unknown, fallback: number) => {
    const parsed = Number(normalizeDigits(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  const normalizeYear = (value: string) => normalizeDigits(value).replace(/[^0-9]/g, '');
  const yearLabel = (value: string) => value.replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const readStructured = (item: PublicAnalysis): StructuredAnalysis | null => {
    try {
      const value = JSON.parse(item.content);
      if (value && value.__shamsehExamAnalysis === 1) return value as StructuredAnalysis;
    } catch { /* older plain-text records are not chart data */ }
    return null;
  };
  const years = useMemo(() => Array.from(new Set(analyses.map((item) => normalizeYear(item.examYear || '')).filter(Boolean))).sort((a, b) => Number(b) - Number(a)), [analyses]);
  useEffect(() => { if (years.length && !years.includes(year)) setYear(years[0]); }, [years, year]);
  const currentAnalyses = analyses.filter((item) => normalizeYear(item.examYear || '') === year);
  const levelLabel = (value?: string | null) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (/MASTER|ARSHAD|کارشناسی ارشد|ارشد/.test(normalized)) return 'کارشناسی ارشد';
    if (/DOCTOR|DOKTOR|دکتری|دکترا/.test(normalized)) return 'دکتری';
    return value || 'مقطع ثبت نشده';
  };
  const questionsFor = (data: StructuredAnalysis) => Array.isArray(data.questions) ? data.questions : [];
  const questionNumber = (question: AnalysisQuestion) => numberValue(question.questionNumber, 0);
  const startFor = (data: StructuredAnalysis) => numberValue(data.startQuestionNumber, 1);
  const covered = (status?: string) => String(status || '').toUpperCase() === 'COVERED';

  const charts = currentAnalyses.map((item, index) => {
    const data = readStructured(item);
    if (!data || !data.fieldName || !questionsFor(data).length) return null;
    const startQuestion = startFor(data);
    const included = questionsFor(data).filter((question) => questionNumber(question) >= startQuestion);
    if (!included.length) return null;
    const coveredCount = included.filter((question) => covered(question.status)).length;
    const palette = ['#168C91', '#3478D4', '#D97706', '#8057C7', '#0F9D78', '#C05276'];
    return { id: item.id, item, data, code: data.fieldCode || '—', field: data.fieldName, level: levelLabel(data.examLevel || item.examLevel), percent: Math.round(coveredCount / included.length * 100), coveredCount, includedCount: included.length, startQuestion, color: palette[index % palette.length] };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  const detailData = selected ? readStructured(selected) : null;
  const detailStart = detailData ? startFor(detailData) : 1;
  const detailAllQuestions = detailData ? questionsFor(detailData).slice().sort((a, b) => questionNumber(a) - questionNumber(b)) : [];
  const detailQuestions = detailAllQuestions.filter((question) => questionNumber(question) >= detailStart);
  const detailCovered = detailQuestions.filter((question) => covered(question.status)).length;
  const detailPercent = detailQuestions.length ? Math.round(detailCovered / detailQuestions.length * 100) : 0;

  return (
    <PageFrame eyebrow="تحلیل کنکورهای گذشته · گزارش پوشش آموزشی" title="تحلیل آماری کنکورهای گذشته" description="نمودار پوشش تمام کدرشته‌ها و مقاطع را برای هر سال بررسی کنید؛ با انتخاب هر نمودار، جدول کامل تحلیل سؤال‌ها باز می‌شود." onBack={onBack}>
      <section style={{ background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 20, padding: '18px clamp(14px, 3vw, 26px)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div><h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>سال کنکور</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 11 }}>تمام نمودارهای ثبت‌شده برای سال انتخاب‌شده نمایش داده می‌شوند.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="انتخاب سال کنکور">
          {years.map((item) => <button key={item} type="button" onClick={() => setYear(item)} aria-pressed={year === item} style={{ padding: '10px 17px', borderRadius: 11, border: '1px solid ' + (year === item ? colors.accent : colors.border), background: year === item ? colors.accent : colors.surfaceAlt, color: year === item ? '#fff' : colors.text, fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>{yearLabel(item)}</button>)}
          <button type="button" onClick={() => void loadAnalyses()} style={secondaryButton(colors)}><RefreshCw size={14}/> تازه‌سازی</button>
        </div>
      </section>

      <section style={{ background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 22, padding: 'clamp(16px, 3vw, 26px)', marginBottom: 20 }}>
        <div style={{ marginBottom: 18 }}><h2 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>نمودار درصد پوشش · کنکور {year ? yearLabel(year) : '—'}</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.9 }}>برای مشاهده جدول کامل، نمودار یا کارت همان کدرشته را انتخاب کنید.</p></div>
        {loading ? <div style={{ padding: 35, textAlign: 'center', color: colors.muted }}>در حال دریافت تحلیل‌ها…</div>
          : error ? <div role="alert" style={{ padding: 20, color: colors.text }}>{error}<div style={{ marginTop: 10 }}><button type="button" onClick={() => void loadAnalyses()} style={primaryButton(colors)}>تلاش مجدد</button></div></div>
          : charts.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: 14 }}>
            {charts.map((chart) => <button key={chart.id} type="button" onClick={() => setSelected(chart.item)} aria-label={'نمایش جدول کامل کدرشته ' + chart.code + '، ' + chart.field} style={{ textAlign: 'right', border: '1px solid ' + colors.border, borderRadius: 17, padding: 17, background: colors.surface, color: colors.text, cursor: 'pointer', minWidth: 0, boxShadow: '0 8px 24px rgba(15,47,61,.035)' }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 8 }}><div><div style={{ fontSize: 11, color: colors.muted }}>کدرشته {chart.code}</div><h3 style={{ margin: '5px 0 0', fontSize: 15, lineHeight: 1.8, fontWeight: 900 }}>{chart.field}</h3><div style={{ marginTop: 4, fontSize: 11, color: colors.muted }}>{chart.level}</div></div><span style={{ fontSize: 11, color: colors.accent, fontWeight: 850, whiteSpace: 'nowrap' }}>جدول کامل ←</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 18 }}>
                <div style={{ width: 108, height: 108, flexShrink: 0, borderRadius: '50%', background: 'conic-gradient(' + chart.color + ' ' + chart.percent + '%, ' + (colors.dark ? '#354248' : '#e7eeee') + ' 0)', display: 'grid', placeItems: 'center' }}><div style={{ width: 78, height: 78, borderRadius: '50%', background: colors.surface, display: 'grid', placeItems: 'center', color: chart.color, fontWeight: 950, fontSize: 21 }}>{yearLabel(String(chart.percent))}٪</div></div>
                <div style={{ minWidth: 0, flex: 1 }}><div style={{ fontSize: 12, lineHeight: 2 }}>پوشش داده‌شده: <strong>{yearLabel(String(chart.coveredCount))}</strong></div><div style={{ fontSize: 12, lineHeight: 2 }}>سؤال‌های مشمول: <strong>{yearLabel(String(chart.includedCount))}</strong></div><div style={{ fontSize: 11, lineHeight: 1.9, color: colors.muted }}>محاسبه از سؤال {yearLabel(String(chart.startQuestion))}</div></div>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: colors.dark ? '#354248' : '#e7eeee', overflow: 'hidden', marginTop: 16 }}><div style={{ width: chart.percent + '%', height: '100%', borderRadius: 99, background: chart.color }} /></div>
            </button>)}
          </div>
          : <div style={{ borderRadius: 14, background: colors.surfaceAlt, padding: 22, color: colors.muted, fontSize: 13, lineHeight: 2 }}>{years.length ? 'برای سال ' + yearLabel(year) + ' هنوز تحلیل ساختاریافته دارای وضعیت سؤال‌ها ثبت نشده است.' : 'هنوز تحلیل ساختاریافته‌ای برای نمایش ثبت نشده است.'}<p style={{ margin: '8px 0 0', fontSize: 11 }}>نمودار فقط از داده واقعی سؤال‌ها ساخته می‌شود؛ درصد نمونه یا حدسی نمایش داده نمی‌شود.</p></div>}
        <p style={{ color: colors.muted, fontSize: 10, lineHeight: 1.9, margin: '15px 0 0' }}>درصد پوشش برابر تعداد سؤال‌های «پوشش داده شده» تقسیم بر سؤال‌های مشمول محاسبه است؛ این درصد، درصد پاسخ صحیح داوطلبان نیست.</p>
      </section>

      {selected && detailData && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(3,10,14,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, backdropFilter: 'blur(5px)' }}>
        <section role="dialog" aria-modal="true" aria-labelledby="exam-analysis-modal-title" style={{ width: 'min(1100px, 100%)', maxHeight: '92vh', overflow: 'auto', background: colors.surface, color: colors.text, border: '1px solid ' + colors.border, borderRadius: 20, boxShadow: '0 24px 90px rgba(0,0,0,.3)', direction: 'rtl' }}>
          <header style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 14, padding: '18px clamp(16px, 3vw, 26px)', background: colors.surface, borderBottom: '1px solid ' + colors.border }}>
            <div><div style={{ fontSize: 11, color: colors.accent, fontWeight: 850 }}>کنکور {yearLabel(normalizeYear(selected.examYear || year))} · کدرشته {detailData.fieldCode || '—'}</div><h2 id="exam-analysis-modal-title" style={{ margin: '5px 0', fontSize: 20, lineHeight: 1.8, fontWeight: 950 }}>{detailData.fieldName || selected.title}</h2><div style={{ fontSize: 12, color: colors.muted }}>{levelLabel(detailData.examLevel || selected.examLevel)}</div></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="بستن پنجره" style={{ ...secondaryButton(colors), flexShrink: 0 }}>بستن ×</button>
          </header>
          <div style={{ padding: '18px clamp(16px, 3vw, 26px) 26px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 10, marginBottom: 18 }}>
              {[['درصد پوشش', yearLabel(String(detailPercent)) + '٪'], ['پوشش داده‌شده', yearLabel(String(detailCovered))], ['تعداد سؤال‌های مشمول', yearLabel(String(detailQuestions.length))], ['شروع محاسبه از سؤال', yearLabel(String(detailStart))]].map(([label, value]) => <div key={label} style={{ padding: 13, border: '1px solid ' + colors.border, borderRadius: 12, background: colors.surfaceAlt }}><div style={{ fontSize: 10, color: colors.muted, marginBottom: 5 }}>{label}</div><strong style={{ fontSize: 18 }}>{value}</strong></div>)}
            </div>
            {detailData.narrative && <p style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 2, color: colors.muted }}>{detailData.narrative}</p>}
            {detailAllQuestions.length ? <div style={{ overflowX: 'auto', border: '1px solid ' + colors.border, borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 12, textAlign: 'right' }}>
                <thead><tr style={{ background: colors.surfaceAlt }}>{['شماره سؤال', 'وضعیت پوشش', 'مبحث', 'کلاس / درس', 'استاد', 'منبع', 'صفحه', 'توضیحات'].map((heading) => <th key={heading} style={{ padding: '12px 10px', borderBottom: '1px solid ' + colors.border, whiteSpace: 'nowrap' }}>{heading}</th>)}</tr></thead>
                <tbody>{detailAllQuestions.map((question, index) => { const inCalculation = questionNumber(question) >= detailStart; return <tr key={question.questionNumber + '-' + index} style={{ borderBottom: index === detailAllQuestions.length - 1 ? 0 : '1px solid ' + colors.border, opacity: inCalculation ? 1 : 0.62 }}>
                  <td style={{ padding: 10, whiteSpace: 'nowrap' }}>{yearLabel(question.questionNumber || '—')}</td><td style={{ padding: 10, whiteSpace: 'nowrap', color: !inCalculation ? colors.muted : covered(question.status) ? '#168C91' : '#c45b5b', fontWeight: 850 }}>{!inCalculation ? 'خارج از محاسبه' : covered(question.status) ? 'پوشش داده شده' : 'پوشش داده نشده'}</td>
                  <td style={{ padding: 10 }}>{question.topic || '—'}</td><td style={{ padding: 10 }}>{question.className || '—'}</td><td style={{ padding: 10 }}>{question.professor || '—'}</td><td style={{ padding: 10 }}>{question.source || '—'}</td><td style={{ padding: 10 }}>{question.page || '—'}</td><td style={{ padding: 10, whiteSpace: 'pre-wrap', minWidth: 180 }}>{question.explanation || '—'}</td>
                </tr>; })}</tbody>
              </table>
            </div> : <div style={{ padding: 20, background: colors.surfaceAlt, borderRadius: 12, color: colors.muted, fontSize: 12 }}>برای این کدرشته، سؤال‌های ساختاریافته‌ای ثبت نشده‌اند.</div>}
            {selected.resourceUrl && <a href={selected.resourceUrl} target="_blank" rel="noreferrer" style={{ ...primaryButton(colors), textDecoration: 'none', marginTop: 16 }}><FileText size={15}/> مشاهده فایل تحلیل کامل <ExternalLink size={15}/></a>}
          </div>
        </section>
      </div>}
    </PageFrame>
  );
}
