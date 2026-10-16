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
    </PageFrame>
  );
}

export function ExamAnalysisPage({ onBack }: { onBack: () => void }) {
  const colors = usePageColors();
  const [analyses, setAnalyses] = useState<PublicAnalysis[]>([]);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('1404');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const normalizeYear = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[^0-9]/g, '');
  const years = useMemo(() => Array.from(new Set(['1404', ...analyses.map((item) => normalizeYear(item.examYear || '')).filter(Boolean)])).sort((a, b) => Number(b) - Number(a)), [analyses]);
  const yearLabel = (value: string) => value.replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const currentAnalyses = analyses.filter((item) => normalizeYear(item.examYear || '') === year);
  const coverageColors = ['#168C91', '#3478D4', '#D97706', '#8057C7', '#0F9D78', '#C05276'];
  const readStructured = (item: PublicAnalysis) => {
    try {
      const value = JSON.parse(item.content);
      if (value && value.__shamsehExamAnalysis === 1) return value as { narrative?: string; fieldCode?: string; fieldName?: string; coveragePercent?: number | null; questions?: Array<{ questionNumber: string; topic: string; className: string; professor: string; source: string; page: string; status: string }> };
    } catch { /* legacy plain-text analysis */ }
    return null;
  };
  const coverageCards = currentAnalyses.map((item, index) => {
    const data = readStructured(item);
    if (!data || data.coveragePercent == null || !data.fieldName) return null;
    return { code: data.fieldCode || '—', field: data.fieldName, percent: data.coveragePercent, color: coverageColors[index % coverageColors.length], soft: coverageColors[index % coverageColors.length] + '12', icon: '◈', title: item.title };
  }).filter((item): item is { code: string; field: string; percent: number; color: string; soft: string; icon: string; title: string } => item !== null);
  const fallbackCoverage = [
    { code: '۱۳۵۷', field: 'هنرهای نمایشی', percent: 63, color: '#168C91', soft: 'rgba(22,140,145,.09)', icon: '◈', title: 'هنرهای نمایشی' },
    { code: '۱۳۵۸', field: 'هنرهای تصویری', percent: 88, color: '#3478D4', soft: 'rgba(52,120,212,.09)', icon: '▧', title: 'هنرهای تصویری' },
    { code: '۱۳۵۹', field: 'پژوهش هنر', percent: 83, color: '#D97706', soft: 'rgba(217,119,6,.09)', icon: '▤', title: 'پژوهش هنر' },
    { code: '۱۱۱۶', field: 'فلسفه', percent: 83, color: '#8057C7', soft: 'rgba(128,87,199,.09)', icon: '⌂', title: 'فلسفه' },
  ];
  const visibleCoverage = coverageCards.length ? coverageCards : year === '1404' ? fallbackCoverage : [];
  const structuredQuestionRows = currentAnalyses.flatMap((item) => {
    const data = readStructured(item);
    return (data?.questions || []).map((q, index) => ({ id: item.id + '-q-' + index, title: item.title, questionNumber: q.questionNumber, topic: q.topic, className: q.className, professor: q.professor, source: q.source, page: q.page, status: q.status, resourceUrl: item.resourceUrl, examLevel: item.examLevel }));
  }).filter((row) => {
    const term = query.trim().toLocaleLowerCase();
    return !term || [row.title, row.questionNumber, row.topic, row.className, row.professor, row.source, row.page].some((value) => value.toLocaleLowerCase().includes(term));
  });
  return (
    <PageFrame eyebrow="تحلیل کنکورهای گذشته · مستند به منابع آموزشی" title="پوشش گسترده سؤالات کنکور در دوره‌های آکادمی شمسه" description="تحلیل سؤال‌های کنکور و تطبیق آن‌ها با مباحث، کلاس‌ها و منابع آموزشی؛ برای آن‌که با اطمینان بیشتری مسیر آمادگی خود را انتخاب کنید." onBack={onBack}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20, alignItems: 'center', marginBottom: 22 }}>
        <div style={{ order: 2, background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 22, padding: 'clamp(20px, 4vw, 34px)', boxShadow: '0 14px 38px rgba(15,47,61,.05)' }}>
          <div style={{ color: colors.accent, fontSize: 12, fontWeight: 900, marginBottom: 10 }}>آکادمی آموزشی شمسه</div>
          <h2 style={{ margin: 0, fontSize: 'clamp(21px, 3vw, 31px)', lineHeight: 1.8, fontWeight: 950 }}>یادگیری هدفمند، با تکیه بر تحلیل کنکورهای گذشته</h2>
          <p style={{ margin: '10px 0 18px', color: colors.muted, fontSize: 13, lineHeight: 2.1 }}>در شمسه، سؤالات کنکور با مباحث و منابع آموزشی تطبیق داده می‌شوند تا میزان پوشش دوره‌ها شفاف و قابل بررسی باشد.</p>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {[[ 'تحلیل تخصصی سؤال‌ها', BookOpenCheck ], [ 'تطبیق با منابع آموزشی', BookOpen ], [ 'بررسی سال‌های مختلف', CalendarDays ]].map(([label, Icon]) => {
              const FeatureIcon = Icon as typeof BookOpen;
              return <span key={label as string} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 10, background: colors.surfaceAlt, color: colors.text, fontSize: 11, fontWeight: 750 }}><FeatureIcon size={15} color={colors.accent}/>{label as string}</span>;
            })}
          </div>
        </div>
        <div style={{ order: 1, minHeight: 220, borderRadius: 22, padding: 22, overflow: 'hidden', background: colors.dark ? 'radial-gradient(circle at 30% 30%, rgba(81,196,187,.28), transparent 40%), linear-gradient(145deg,#102f3d,#11191c)' : 'radial-gradient(circle at 24% 25%, rgba(81,196,187,.35), transparent 42%), linear-gradient(145deg,#e7f7f7,#f8fbff)', border: '1px solid ' + colors.border, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 104, height: 104, borderRadius: '50%', border: '1px solid rgba(22,140,145,.35)', display: 'grid', placeItems: 'center', background: colors.surface, boxShadow: '0 12px 40px rgba(22,140,145,.12)', color: colors.accent }}><BookOpenCheck size={48}/></div>
          <div style={{ marginTop: 14, fontWeight: 900, fontSize: 17 }}>تحلیل مستند، انتخاب آگاهانه</div><div style={{ marginTop: 5, fontSize: 11, color: colors.muted }}>سؤال · مبحث · کلاس · منبع</div>
        </div>
      </section>

      <section style={{ background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 20, padding: '18px clamp(14px, 3vw, 26px)', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div><h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>سال کنکور را انتخاب کنید</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 11 }}>اطلاعات هر سال به‌صورت مستقل نمایش داده می‌شود.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="انتخاب سال کنکور">
          {years.map((item) => <button type="button" key={item} onClick={() => { setYear(item); setQuery(''); setExpanded(null); }} aria-pressed={year === item} style={{ padding: '10px 17px', borderRadius: 11, border: '1px solid ' + (year === item ? colors.accent : colors.border), background: year === item ? colors.accent : colors.surfaceAlt, color: year === item ? '#fff' : colors.text, fontSize: 12, fontWeight: 850, cursor: 'pointer' }}>{yearLabel(item)}</button>)}
        </div>
      </section>

      <section style={{ background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 22, padding: 'clamp(16px, 3vw, 26px)', marginBottom: 20 }}>
        <div style={{ marginBottom: 18 }}><h2 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>درصد پوشش سؤالات کنکور {yearLabel(year)}</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.9 }}>بر اساس تطبیق محتوای سؤالات با دوره‌ها و منابع آموزشی آکادمی شمسه.</p></div>
        {visibleCoverage.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 205px), 1fr))', gap: 13 }}>
          {visibleCoverage.map((item) => <article key={item.code} style={{ border: '1px solid ' + colors.border, borderRadius: 17, padding: 17, background: item.soft, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 11, color: colors.muted }}>کدرشته {item.code}</span><span style={{ fontSize: 18, color: item.color }}>{item.icon}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginTop: 12 }}>
              <div style={{ width: 86, height: 86, borderRadius: '50%', flexShrink: 0, background: 'conic-gradient(' + item.color + ' ' + item.percent + '%, ' + item.color + '22 0)', display: 'grid', placeItems: 'center' }}><div style={{ width: 66, height: 66, borderRadius: '50%', background: colors.surface, display: 'grid', placeItems: 'center', color: item.color, fontWeight: 950, fontSize: 20 }}>{yearLabel(String(item.percent))}٪</div></div>
              <div style={{ minWidth: 0 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, lineHeight: 1.8 }}>{item.field}</h3><p style={{ margin: '4px 0 0', color: colors.muted, fontSize: 11 }}>کارشناسی ارشد</p><p style={{ margin: '7px 0 0', color: item.color, fontSize: 11, fontWeight: 850 }}>پوشش اعلام‌شده در دوره‌ها</p></div>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: item.color + '22', overflow: 'hidden', marginTop: 15 }}><div style={{ width: item.percent + '%', height: '100%', borderRadius: 99, background: item.color }} /></div>
          </article>)}
        </div> : <div style={{ borderRadius: 14, background: colors.surfaceAlt, padding: 22, color: colors.muted, fontSize: 13, lineHeight: 2 }}>برای سال {yearLabel(year)} هنوز درصد پوشش ساختاریافته‌ای ثبت نشده است. پس از ثبت اطلاعات معتبر در پنل مدیریت، نمودار همان سال در این بخش نمایش داده می‌شود.</div>}
        <p style={{ color: colors.muted, fontSize: 10, lineHeight: 1.9, margin: '15px 0 0' }}>درصدها بیانگر پوشش آموزشی اعلام‌شده هستند و به معنای درصد پاسخ صحیح یا تضمین نتیجه آزمون نیستند.</p>
      </section>

      <section style={{ background: colors.surface, border: '1px solid ' + colors.border, borderRadius: 22, padding: 'clamp(16px, 3vw, 26px)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 15 }}>
          <div><h2 style={{ margin: 0, fontSize: 19, fontWeight: 950 }}>جدول ردیابی سؤال‌ها و منابع پوشش</h2><p style={{ margin: '5px 0 0', color: colors.muted, fontSize: 12, lineHeight: 1.9 }}>مشاهده ارتباط سؤال‌های تحلیل‌شده با مباحث و منابع آموزشی.</p></div>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}><Search size={16} color={colors.muted} style={{ position: 'absolute', right: 12, top: 13 }}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجو در تحلیل و منابع..." aria-label="جست‌وجو در جدول تحلیل سؤال‌ها" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 37px 11px 12px', borderRadius: 10, border: '1px solid ' + colors.border, background: colors.surfaceAlt, color: colors.text, fontSize: 12 }}/></div>
        </div>
        {loading ? <div style={{ padding: 25, textAlign: 'center', color: colors.muted }}>در حال دریافت جزئیات تحلیل‌ها...</div>
          : error ? <div style={{ padding: 20, color: colors.muted, fontSize: 12 }}>{error} <button type="button" onClick={() => void loadAnalyses()} style={secondaryButton(colors)}>تلاش مجدد</button></div>
          : structuredQuestionRows.length ? <div style={{ display: 'grid', gap: 9 }}>
            {structuredQuestionRows.map((row) => <article key={row.id} style={{ border: '1px solid ' + colors.border, borderRadius: 13, overflow: 'hidden', background: colors.surface }}>
              <button type="button" onClick={() => setExpanded(expanded === row.id ? null : row.id)} aria-expanded={expanded === row.id} style={{ width: '100%', border: 0, cursor: 'pointer', textAlign: 'right', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: 14, background: colors.surfaceAlt, color: colors.text }}>
                <span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12, lineHeight: 1.9 }}>{row.title}</strong><span style={{ display: 'block', color: colors.muted, fontSize: 11, lineHeight: 1.9 }}>سؤال {yearLabel(row.questionNumber || '—')} · {row.topic || 'مبحث ثبت نشده'} · {row.status === 'COVERED' ? 'پوشش داده‌شده' : row.status === 'PARTIAL' ? 'پوشش نسبی' : row.status === 'NOT_COVERED' ? 'پوشش داده‌نشده' : 'وضعیت نامشخص'}</span></span><span style={{ color: colors.accent, fontSize: 12, fontWeight: 900 }}>{expanded === row.id ? 'بستن −' : 'جزئیات +'}</span>
              </button>
              {expanded === row.id && <div style={{ padding: 14, display: 'grid', gap: 9, fontSize: 12, lineHeight: 2 }}><div><strong>شماره سؤال:</strong> {yearLabel(row.questionNumber || '—')}</div><div><strong>مبحث:</strong> {row.topic || 'ثبت نشده'}</div><div><strong>کلاس مرتبط:</strong> {row.className || 'ثبت نشده'}</div><div><strong>استاد:</strong> {row.professor || 'ثبت نشده'}</div><div><strong>منبع:</strong> {row.source || 'ثبت نشده'}</div><div><strong>صفحه / نکته:</strong> {row.page || 'ثبت نشده'}</div><div><strong>وضعیت پوشش:</strong> {row.status === 'COVERED' ? 'پوشش داده‌شده' : row.status === 'PARTIAL' ? 'پوشش نسبی' : row.status === 'NOT_COVERED' ? 'پوشش داده‌نشده' : 'نامشخص'}</div>{row.resourceUrl ? <a href={row.resourceUrl} target="_blank" rel="noreferrer" style={{ ...primaryButton(colors), textDecoration: 'none', justifySelf: 'start' }}>مشاهده فایل تحلیل <ExternalLink size={15}/></a> : <span style={{ color: colors.muted }}>برای این تحلیل فایل جداگانه‌ای ثبت نشده است.</span>}</div>}
            </article>)}
          </div>
          : <div style={{ padding: 22, borderRadius: 14, background: colors.surfaceAlt, color: colors.muted, fontSize: 12, lineHeight: 2 }}>هنوز ردیف‌های ساختاریافته سؤال، مبحث، کلاس و منبع برای این سال در پنل مدیریت ثبت نشده‌اند. تا زمان ثبت جزئیات واقعی، اطلاعاتی به‌صورت حدسی نمایش داده نمی‌شود.</div>}
      </section>

      {currentAnalyses.some((item) => item.resourceUrl) && <section style={{ background: colors.dark ? 'linear-gradient(120deg,#10272c,#11191c)' : 'linear-gradient(120deg,#f7fbff,#eaf7f7)', border: '1px solid ' + colors.border, borderRadius: 20, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div><h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>دریافت فایل تحلیل کامل کنکور {yearLabel(year)}</h2><p style={{ margin: '6px 0 0', color: colors.muted, fontSize: 11 }}>برای مشاهده جزئیات بیشتر، فایل تحلیل منتشرشده را دریافت کنید.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{currentAnalyses.filter((item) => item.resourceUrl).map((item) => <a key={item.id} href={item.resourceUrl!} target="_blank" rel="noreferrer" style={{ ...primaryButton(colors), textDecoration: 'none' }}><FileText size={15}/>{item.title}</a>)}</div>
      </section>}
    </PageFrame>
  );
}
