'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Sprout, Wallet, LogIn, LogOut, UserPlus, Upload, Loader2, CheckCircle2, XCircle, RefreshCw,
  Smartphone, Leaf, GraduationCap, TrendingUp, Users, AlertCircle, Coins, Globe, PlayCircle, Award, ChevronRight, ArrowLeft,
} from 'lucide-react';

import { I18nProvider, useT, LANGS } from '@/lib/i18n';

const HERO_IMG = 'https://images.unsplash.com/photo-1567471945073-319ac8b0366a?auto=format&fit=crop&w=1600&q=80';
const DIAGNOSE_IMG = 'https://images.unsplash.com/photo-1646451353399-e7c0ac1d9da4?auto=format&fit=crop&w=1200&q=80';

function bwp(n) {
  const v = Number(n || 0);
  return 'BWP ' + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

export default function Page() {
  return (
    <I18nProvider>
      <Home />
    </I18nProvider>
  );
}

function Home() {
  const { t } = useT();
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [activeCourseId, setActiveCourseId] = useState(null);

  useEffect(() => {
    (async () => { try { const { user } = await api('/me'); setUser(user); } catch {} })();
    try {
      const u = new URL(window.location.href);
      const v = u.searchParams.get('view'); if (v) setView(v);
      const c = u.searchParams.get('course'); if (c) { setActiveCourseId(c); setView('course-detail'); }
    } catch {}
  }, []);

  const refreshUser = async () => { try { const { user } = await api('/me'); setUser(user); } catch { setUser(null); } };

  const goto = (v, params = {}) => {
    setView(v);
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href);
      if (v === 'home') u.searchParams.delete('view'); else u.searchParams.set('view', v);
      Object.entries(params).forEach(([k, val]) => val ? u.searchParams.set(k, val) : u.searchParams.delete(k));
      if (v !== 'course-detail') u.searchParams.delete('course');
      window.history.replaceState({}, '', u.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.gtag?.('event', 'view_change', { view: v });
    }
  };

  const openCourse = (id) => { setActiveCourseId(id); goto('course-detail', { course: id }); };

  const requireAuth = (next) => { if (!user) { setAuthMode('login'); setAuthOpen(true); return false; } if (next) setView(next); return true; };

  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); goto('home'); toast.success(t('signed_out')); };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header view={view} goto={goto} user={user} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} onSignup={() => { setAuthMode('signup'); setAuthOpen(true); }} onLogout={logout} />

      <main className="flex-1">
        {view === 'home' && <HomeView goto={goto} onStart={() => requireAuth('diagnose')} />}
        {view === 'diagnose' && (user ? <DiagnoseView user={user} refreshUser={refreshUser} onNeedAuth={() => { setAuthMode('login'); setAuthOpen(true); }} /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />)}
        {view === 'wallet' && (user ? <WalletView user={user} refreshUser={refreshUser} /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />)}
        {view === 'courses' && <CoursesView user={user} onNeedAuth={() => { setAuthMode('login'); setAuthOpen(true); }} openCourse={openCourse} />}
        {view === 'course-detail' && (user ? <CourseDetailView courseId={activeCourseId} user={user} onBack={() => goto('courses')} /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />)}
        {view === 'blog' && <BlogListView />}
        {view === 'admin' && (user?.is_admin ? <AdminView /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} adminHint />)}
      </main>

      <Footer goto={goto} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} setMode={setAuthMode} onSuccess={async (u) => { setUser(u); setAuthOpen(false); toast.success(t('welcome', { name: u.name })); window.gtag?.('event', 'login', { method: 'email' }); }} />
    </div>
  );
}

// ============ HEADER ============
function Header({ view, goto, user, onLogin, onSignup, onLogout }) {
  const { t, lang, setLang } = useT();
  const nav = [
    { key: 'home', label: t('nav_home') },
    { key: 'diagnose', label: t('nav_diagnose') },
    { key: 'courses', label: t('nav_courses') },
    { key: 'blog', label: t('nav_blog') },
    { key: 'wallet', label: t('nav_wallet') },
  ];
  if (user?.is_admin) nav.push({ key: 'admin', label: t('nav_admin') });
  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between h-16">
        <button onClick={() => goto('home')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white"><Sprout className="w-5 h-5" /></div>
          <span className="font-extrabold text-xl text-emerald-900 tracking-tight">mAgri</span>
          <Badge variant="secondary" className="hidden md:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200">Botswana</Badge>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(n => (
            <button key={n.key} onClick={() => goto(n.key)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === n.key || (view === 'course-detail' && n.key === 'courses') ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-100'}`}>{n.label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1"><Globe className="w-4 h-4" />{currentLang.flag} <span className="hidden sm:inline text-xs">{currentLang.code.toUpperCase()}</span></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LANGS.map(l => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} className={lang === l.code ? 'bg-emerald-50' : ''}>
                  <span className="mr-2">{l.flag}</span>{l.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm"><Coins className="w-4 h-4 text-emerald-600" /><span className="font-semibold">{bwp(user.balance_bwp)}</span></div>
              <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="w-4 h-4 mr-1" />{t('btn_signout')}</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onLogin}><LogIn className="w-4 h-4 mr-1" />{t('btn_signin')}</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onSignup}><UserPlus className="w-4 h-4 mr-1" />{t('btn_signup')}</Button>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden border-t bg-white">
        <div className="container flex overflow-x-auto gap-1 py-2">
          {nav.map(n => (<button key={n.key} onClick={() => goto(n.key)} className={`px-3 py-1 rounded text-xs whitespace-nowrap ${view === n.key ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600'}`}>{n.label}</button>))}
        </div>
      </div>
    </header>
  );
}

// ============ HOME ============
function HomeView({ goto, onStart }) {
  const { t } = useT();
  const [insights, setInsights] = useState([]);
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  useEffect(() => { (async () => { try { const [a, b, c] = await Promise.all([api('/insights'), api('/courses'), api('/blogs')]); setInsights(a.insights || []); setCourses(b.courses || []); setPosts(c.posts || []); } catch (e) { console.error(e); } })(); }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Farmer in field" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-900/70 to-emerald-800/40" />
        </div>
        <div className="relative container py-20 md:py-28 text-white">
          <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-300/40 mb-5">{t('by_brastorne')}</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl">{t('hero_title')}</h1>
          <p className="mt-5 text-lg md:text-xl max-w-2xl text-emerald-50">{t('hero_desc')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white" onClick={onStart}><Smartphone className="w-4 h-4 mr-2" />{t('hero_cta_diagnose')}</Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20" onClick={() => goto('courses')}><GraduationCap className="w-4 h-4 mr-2" />{t('hero_cta_courses')}</Button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl text-emerald-50">
            {[{ k: '3', v: t('stat_courses') }, { k: '3', v: t('stat_stories') }, { k: 'AI', v: t('stat_diagnose') }].map(s => (
              <div key={s.v} className="bg-white/10 backdrop-blur rounded-lg px-4 py-3"><div className="text-2xl font-bold">{s.k}</div><div className="text-xs uppercase tracking-wider">{s.v}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 mb-3">{t('new_badge')}</Badge>
            <h2 className="text-3xl font-bold mb-3">{t('diag_title')}</h2>
            <p className="text-muted-foreground mb-4">{t('diag_desc')}</p>
            <ul className="space-y-2 text-sm mb-6">
              {['diag_b1', 'diag_b2', 'diag_b3', 'diag_b4'].map(k => (
                <li key={k} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />{t(k)}</li>
              ))}
            </ul>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onStart}>{t('diag_start')}</Button>
          </div>
          <img src={DIAGNOSE_IMG} alt="Farmer using a phone" className="rounded-xl shadow-xl aspect-video object-cover" />
        </div>
      </section>

      <section className="bg-emerald-50/60 py-16">
        <div className="container">
          <SectionHeader title={t('sec_insights')} cta={t('view_all')} onCta={() => goto('blog')} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {insights.map(f => (
              <Card key={f._id} className="overflow-hidden border-emerald-100">
                <img src={f.thumbnail} alt={f.name} className="w-full aspect-[4/3] object-cover" />
                <CardHeader><CardTitle className="text-lg">{f.name}</CardTitle><CardDescription>{f.location}</CardDescription></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.story}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <SectionHeader title={t('sec_courses')} cta={t('view_all')} onCta={() => goto('courses')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(c => <CourseCard key={c._id} course={c} onOpen={() => goto('courses')} />)}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container">
          <SectionHeader title={t('sec_blogs')} cta={t('view_all')} onCta={() => goto('blog')} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map(p => <BlogCard key={p._id} post={p} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, cta, onCta }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
      {cta && <button onClick={onCta} className="text-sm text-emerald-700 hover:underline font-medium">{cta} →</button>}
    </div>
  );
}

function CourseCard({ course, onOpen, enrolled, onEnroll, onContinue }) {
  const { t } = useT();
  const lectureCount = (course.lectures || []).length;
  return (
    <Card className="overflow-hidden hover:shadow-md transition flex flex-col">
      <img src={course.thumbnail} alt={course.title} className="w-full aspect-[16/10] object-cover" />
      <CardHeader className="pb-2">
        <Badge variant="outline" className="w-fit text-emerald-700 border-emerald-300 bg-emerald-50">{t('course_label')}</Badge>
        <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground flex-1">{course.excerpt}</CardContent>
      {enrolled && (
        <div className="px-6 pb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{t('course_progress')}</span><span>{enrolled.progress || 0}%</span></div>
          <Progress value={enrolled.progress || 0} className="h-1.5" />
        </div>
      )}
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{course.duration_min || 'N/A'} min · {lectureCount || 16} {t('course_lectures')}</span>
        {!enrolled && onEnroll && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onEnroll}>{t('enroll')}</Button>}
        {enrolled && !enrolled.completed_at && onContinue && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onContinue}>{t('course_continue')}<ChevronRight className="w-3 h-3 ml-1" /></Button>}
        {enrolled?.completed_at && onContinue && <Button size="sm" variant="outline" onClick={onContinue}><Award className="w-3 h-3 mr-1" />{t('completed')}</Button>}
        {!onEnroll && !onContinue && onOpen && <Button size="sm" variant="ghost" onClick={onOpen}>{t('more_info')}</Button>}
      </CardFooter>
    </Card>
  );
}

function BlogCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition h-full">
        <img src={post.thumbnail} alt={post.title} className="w-full aspect-[16/10] object-cover" />
        <CardHeader><CardTitle className="text-base leading-snug line-clamp-2">{post.title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</CardContent>
      </Card>
    </Link>
  );
}

// ============ AUTH WALL & DIALOG ============
function AuthWall({ goto, onLogin, adminHint }) {
  const { t } = useT();
  return (
    <div className="container py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4"><LogIn className="w-6 h-6 text-emerald-700" /></div>
        <h2 className="text-2xl font-bold mb-2">{t('authwall_title')}</h2>
        <p className="text-muted-foreground mb-6">{t('authwall_desc')}</p>
        {adminHint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">{t('auth_admin_hint')}<code>admin@magri.africa / admin123</code></p>}
        <div className="flex gap-3 justify-center"><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onLogin}>{t('btn_signin')}</Button><Button variant="outline" onClick={() => goto('home')}>{t('authwall_back')}</Button></div>
      </div>
    </div>
  );
}

function AuthDialog({ open, onOpenChange, mode, setMode, onSuccess }) {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      const path = mode === 'signup' ? '/auth/signup' : '/auth/login';
      const { user } = await api(path, { method: 'POST', body: { email, password, name } });
      onSuccess(user);
    } catch (e) { toast.error(e.message || 'Auth failed'); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'signup' ? t('auth_signup_title') : t('auth_signin_title')}</DialogTitle>
          <DialogDescription>{mode === 'signup' ? t('auth_signup_desc') : t('auth_signin_desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode === 'signup' && (<div><Label>{t('auth_name')}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>)}
          <div><Label>{t('auth_email')}</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div><Label>{t('auth_password')}</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading} onClick={submit}>{loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{mode === 'signup' ? t('btn_signup') : t('btn_signin')}</Button>
          <div className="text-sm text-center text-muted-foreground">
            {mode === 'signup' ? (<>{t('auth_have_acct')} <button className="text-emerald-700 underline" onClick={() => setMode('login')}>{t('btn_signin')}</button></>) : (<>{t('auth_no_acct')} <button className="text-emerald-700 underline" onClick={() => setMode('signup')}>{t('auth_create')}</button></>)}
          </div>
          <p className="text-xs text-center text-muted-foreground">{t('auth_admin_hint')}<code>admin@magri.africa / admin123</code></p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ DIAGNOSE ============
function DiagnoseView({ user, refreshUser, onNeedAuth }) {
  const { t } = useT();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCost, setLastCost] = useState(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const pickImage = (file) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast.error(t('err_image_too_large')); return; }
    const r = new FileReader(); r.onload = () => setImage(r.result); r.readAsDataURL(file);
  };

  const send = async () => {
    if (!text && !image) { toast.error(t('err_text_or_image')); return; }
    const userMsg = { role: 'user', content: text || '[image analysis]', image_preview: image };
    setMessages(m => [...m, userMsg]);
    setText(''); const sentImg = image; setImage(null);
    setLoading(true);
    try {
      const payload = { text: userMsg.content, session_id: sessionId };
      if (sentImg) payload.image_base64 = sentImg;
      const res = await api('/diagnose', { method: 'POST', body: payload });
      setSessionId(res.session_id);
      setLastCost({ input_tokens: res.input_tokens, output_tokens: res.output_tokens, cost_bwp: res.cost_bwp });
      setMessages(m => [...m, { role: 'assistant', content: res.reply, meta: { input_tokens: res.input_tokens, output_tokens: res.output_tokens, cost_bwp: res.cost_bwp, model: res.model } }]);
      await refreshUser();
      window.gtag?.('event', 'ai_diagnose', { cost_bwp: res.cost_bwp, tokens: (res.input_tokens + res.output_tokens) });
    } catch (e) {
      if (e.status === 401) { onNeedAuth(); return; }
      if (e.status === 402) toast.error(t('insufficient'));
      else toast.error(e.message || 'Diagnose failed');
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e.message}`, error: true }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-8 grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card className="h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><Leaf className="w-5 h-5 text-emerald-600" />{t('diag_chat_title')}</CardTitle>
            <CardDescription>{t('diag_chat_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sprout className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
                <p className="font-medium">{t('diag_empty_title')}</p>
                <p className="text-xs">{t('diag_empty_hint')}</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-2.5 ${m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  {m.image_preview && <img src={m.image_preview} alt="uploaded" className="rounded mb-2 max-h-48" />}
                  <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'prose-invert' : ''}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                  {m.meta && (
                    <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500 flex gap-3">
                      <span>in {m.meta.input_tokens} · out {m.meta.output_tokens} tok</span>
                      <span>{bwp(m.meta.cost_bwp)}</span>
                      <span className="truncate">{m.meta.model}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (<div className="flex justify-start"><div className="bg-gray-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600"><Loader2 className="w-4 h-4 animate-spin" /> {t('diag_thinking')}</div></div>)}
            <div ref={bottomRef} />
          </CardContent>
          <div className="border-t p-3">
            {image && (<div className="relative w-28 mb-2"><img src={image} alt="pending" className="rounded aspect-square object-cover" /><button onClick={() => setImage(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white text-xs">×</button></div>)}
            <div className="flex gap-2 items-end">
              <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /></Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('diag_input_placeholder')} className="min-h-[44px] max-h-32" onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }} />
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={send} disabled={loading}>{t('diag_send')}</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{t('diag_kbd')}</p>
          </div>
        </Card>
      </div>
      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" />{t('side_wallet')}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-700">{bwp(user.balance_bwp)}</div><p className="text-xs text-muted-foreground mt-1">{t('side_balance_avail')}</p></CardContent>
        </Card>
        {lastCost && (
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('side_last_call')}</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span>{t('side_input_tokens')}</span><span className="font-mono">{lastCost.input_tokens}</span></div>
              <div className="flex justify-between"><span>{t('side_output_tokens')}</span><span className="font-mono">{lastCost.output_tokens}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t"><span>{t('side_cost')}</span><span>{bwp(lastCost.cost_bwp)}</span></div>
            </CardContent>
          </Card>
        )}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader><CardTitle className="text-sm">{t('side_pricing_title')}</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1 text-emerald-900">
            <div>{t('side_pricing_in')}</div><div>{t('side_pricing_out')}</div>
            <div className="pt-1 text-emerald-700">{t('side_pricing_topup')}</div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

// ============ WALLET (unchanged behavior, translated) ============
function WalletView({ user, refreshUser }) {
  const { t } = useT();
  const [txs, setTxs] = useState([]);
  const [usage, setUsage] = useState({ logs: [], totals: {} });
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState('50');
  const [msisdn, setMsisdn] = useState('+267 71 234 567');
  const [activeTx, setActiveTx] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  const load = async () => {
    const [a, b] = await Promise.all([api('/billing/transactions'), api('/usage')]);
    setTxs(a.transactions || []); setUsage(b);
  };
  useEffect(() => { load(); }, []);

  const startTopup = async () => {
    try {
      const amt = parseFloat(amount);
      const res = await api('/billing/topup', { method: 'POST', body: { amount_bwp: amt, msisdn } });
      setActiveTx(res); setCheckoutStatus('pending'); setTopupOpen(true);
      const poll = async () => {
        try {
          const r = await api(`/billing/tx/${res.tx_id}`);
          setActiveTx(old => ({ ...old, ...r.tx }));
          if (r.tx.status === 'success') {
            setCheckoutStatus('success'); toast.success(t('topup_success')); await refreshUser(); await load();
            window.gtag?.('event', 'topup_success', { amount_bwp: r.tx.amount_bwp });
          } else if (r.tx.status === 'failed') {
            setCheckoutStatus('failed'); toast.error(t('topup_failed') + ': ' + (r.tx.failure_reason || '')); await load();
            window.gtag?.('event', 'topup_failed');
          } else { setTimeout(poll, 1500); }
        } catch (e) { console.error(e); }
      };
      setTimeout(poll, 1500);
    } catch (e) { toast.error(e.message); }
  };

  const retry = async (txId) => {
    try {
      await api(`/billing/retry/${txId}`, { method: 'POST' });
      toast.info(t('topup_retry'));
      setActiveTx({ tx_id: txId, amount_bwp: txs.find(t2 => t2._id === txId)?.amount_bwp });
      setCheckoutStatus('pending'); setTopupOpen(true);
      const poll = async () => {
        const r = await api(`/billing/tx/${txId}`);
        setActiveTx(old => ({ ...old, ...r.tx }));
        if (r.tx.status === 'success') { setCheckoutStatus('success'); await refreshUser(); await load(); }
        else if (r.tx.status === 'failed') { setCheckoutStatus('failed'); await load(); }
        else setTimeout(poll, 1500);
      };
      setTimeout(poll, 1500);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white md:col-span-1">
          <CardHeader><CardDescription className="text-emerald-100">{t('wallet_balance')}</CardDescription><CardTitle className="text-4xl">{bwp(user.balance_bwp)}</CardTitle></CardHeader>
          <CardFooter><Button className="bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => setTopupOpen(true)}><Smartphone className="w-4 h-4 mr-2" />{t('wallet_topup')}</Button></CardFooter>
        </Card>
        <Card><CardHeader><CardDescription>{t('wallet_calls')}</CardDescription><CardTitle className="text-3xl">{usage.totals?.calls || 0}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">In {usage.totals?.total_input || 0} / Out {usage.totals?.total_output || 0}</CardContent></Card>
        <Card><CardHeader><CardDescription>{t('wallet_spend')}</CardDescription><CardTitle className="text-3xl">{bwp(usage.totals?.total_cost)}</CardTitle></CardHeader></Card>
      </div>
      <Tabs defaultValue="tx">
        <TabsList><TabsTrigger value="tx">{t('tab_tx')}</TabsTrigger><TabsTrigger value="logs">{t('tab_logs')}</TabsTrigger></TabsList>
        <TabsContent value="tx">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="p-3">{t('th_date')}</th><th className="p-3">{t('th_type')}</th><th className="p-3">{t('th_desc')}</th><th className="p-3 text-right">{t('th_amount')}</th><th className="p-3">{t('th_status')}</th><th className="p-3"></th></tr></thead>
              <tbody>
                {txs.map(tr => (
                  <tr key={tr._id} className="border-t">
                    <td className="p-3 text-xs text-muted-foreground">{new Date(tr.created_at).toLocaleString()}</td>
                    <td className="p-3">{tr.type === 'topup' ? <Badge className="bg-emerald-100 text-emerald-800">Top-up</Badge> : <Badge variant="secondary">AI debit</Badge>}</td>
                    <td className="p-3">{tr.description || tr.orange_ref || '—'}{tr.failure_reason && <div className="text-xs text-red-600">{tr.failure_reason}</div>}</td>
                    <td className={`p-3 text-right font-mono ${tr.type === 'topup' ? 'text-emerald-700' : 'text-red-600'}`}>{tr.type === 'topup' ? '+' : '-'}{bwp(tr.amount_bwp)}</td>
                    <td className="p-3">
                      {tr.status === 'success' && <Badge className="bg-emerald-100 text-emerald-800">✓ {tr.status}</Badge>}
                      {tr.status === 'pending' && <Badge className="bg-amber-100 text-amber-800">⏳ {tr.status}</Badge>}
                      {tr.status === 'failed' && <Badge className="bg-red-100 text-red-800">✗ {tr.status}</Badge>}
                    </td>
                    <td className="p-3">{tr.status === 'failed' && tr.type === 'topup' && (<Button size="sm" variant="outline" onClick={() => retry(tr._id)}><RefreshCw className="w-3 h-3 mr-1" />{t('topup_retry')}</Button>)}</td>
                  </tr>
                ))}
                {txs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">—</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500"><tr><th className="p-3">{t('th_date')}</th><th className="p-3">{t('th_model')}</th><th className="p-3">{t('th_in')}</th><th className="p-3">{t('th_out')}</th><th className="p-3">{t('th_cost')}</th><th className="p-3">{t('th_prompt')}</th><th className="p-3">{t('th_status')}</th></tr></thead>
              <tbody>
                {usage.logs?.map(l => (
                  <tr key={l._id} className="border-t">
                    <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="p-3 text-xs font-mono">{l.model || '—'}</td>
                    <td className="p-3 text-xs">{l.input_tokens || 0}</td>
                    <td className="p-3 text-xs">{l.output_tokens || 0}</td>
                    <td className="p-3 text-xs font-semibold">{bwp(l.cost_bwp || 0)}</td>
                    <td className="p-3 text-xs truncate max-w-xs">{l.prompt_preview || (l.had_image ? '[image]' : '—')}</td>
                    <td className="p-3"><Badge className="text-xs">{l.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-500" />{t('topup_title')}</DialogTitle><DialogDescription>{t('topup_desc')}</DialogDescription></DialogHeader>
          {!activeTx && (
            <div className="space-y-3">
              <div>
                <Label>{t('topup_amount')}</Label>
                <Input type="number" min={1} max={10000} value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="flex gap-2 mt-2">{[20, 50, 100, 200].map(v => <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))}>{v}</Button>)}</div>
              </div>
              <div><Label>{t('topup_msisdn')}</Label><Input value={msisdn} onChange={e => setMsisdn(e.target.value)} /></div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={startTopup}>{t('topup_pay', { amount: bwp(parseFloat(amount || 0)) })}</Button>
              <p className="text-xs text-center text-muted-foreground">{t('topup_mock_note')}</p>
            </div>
          )}
          {activeTx && (
            <div className="space-y-4 py-4 text-center">
              {checkoutStatus === 'pending' && (<>
                <div className="w-20 h-20 rounded-full bg-orange-100 mx-auto flex items-center justify-center"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /></div>
                <div><div className="font-semibold">{t('topup_pending')}</div><p className="text-xs text-muted-foreground mt-1">{t('topup_pending_hint', { ref: activeTx.orange_ref || '' })}</p></div>
                <Progress value={60} />
              </>)}
              {checkoutStatus === 'success' && (<>
                <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
                <div><div className="font-bold text-lg">{t('topup_success')}</div><p className="text-sm text-muted-foreground">{t('topup_success_desc', { amount: bwp(activeTx.amount_bwp) })}</p></div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { setTopupOpen(false); setActiveTx(null); setCheckoutStatus(null); }}>{t('topup_done')}</Button>
              </>)}
              {checkoutStatus === 'failed' && (<>
                <XCircle className="w-20 h-20 text-red-500 mx-auto" />
                <div><div className="font-bold text-lg">{t('topup_failed')}</div><p className="text-sm text-muted-foreground">{activeTx.failure_reason || ''}</p></div>
                <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => { setTopupOpen(false); setActiveTx(null); setCheckoutStatus(null); }}>{t('topup_close')}</Button><Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => retry(activeTx._id || activeTx.tx_id)}>{t('topup_retry')}</Button></div>
              </>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ COURSES LIST ============
function CoursesView({ user, onNeedAuth, openCourse }) {
  const { t } = useT();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const load = async () => {
    const a = await api('/courses'); setCourses(a.courses || []);
    if (user) { try { const b = await api('/courses/mine'); setEnrollments(b.enrollments || []); } catch {} }
  };
  useEffect(() => { load(); }, [user?._id]);

  const enroll = async (course_id) => {
    if (!user) return onNeedAuth();
    try { await api('/courses/enroll', { method: 'POST', body: { course_id } }); toast.success(t('enrolled_ok')); await load(); openCourse(course_id); window.gtag?.('event', 'course_enroll', { course_id }); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">{t('courses_title')}</h1>
      <p className="text-muted-foreground mb-8">{t('courses_desc')}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map(c => {
          const e = enrollments.find(x => x.course_id === c._id);
          return (<CourseCard key={c._id} course={c} enrolled={e} onEnroll={() => enroll(c._id)} onContinue={() => openCourse(c._id)} />);
        })}
      </div>
    </div>
  );
}

// ============ COURSE DETAIL (video player + progress + certificate) ============
function CourseDetailView({ courseId, user, onBack }) {
  const { t, lang } = useT();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const load = async () => {
    const c = await api(`/courses/by-id/${courseId}`);
    setCourse(c.course);
    try {
      const me = await api('/courses/mine');
      const e = (me.enrollments || []).find(x => x.course_id === courseId);
      if (e) setEnrollment(e);
      else { await api('/courses/enroll', { method: 'POST', body: { course_id: courseId } }); const me2 = await api('/courses/mine'); setEnrollment((me2.enrollments || []).find(x => x.course_id === courseId)); }
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (courseId) load(); }, [courseId]);

  if (!course) return <div className="container py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const lectures = course.lectures || [];
  const watched = new Set(enrollment?.watched_lectures || []);
  const active = lectures[activeIdx];
  const progress = enrollment?.progress || 0;

  const markWatched = async () => {
    if (!active) return;
    try {
      const r = await api('/courses/watch', { method: 'POST', body: { course_id: courseId, lecture_id: active._id } });
      setEnrollment(r.enrollment);
      window.gtag?.('event', 'lecture_watched', { course_id: courseId, lecture_id: active._id });
      if (r.enrollment?.completed_at && !enrollment?.completed_at) {
        toast.success(t('completed_ok', { id: r.enrollment.certificate_id.slice(0, 8) }));
        window.gtag?.('event', 'course_complete', { course_id: courseId });
      }
      if (activeIdx < lectures.length - 1) setActiveIdx(activeIdx + 1);
    } catch (e) { toast.error(e.message); }
  };

  const downloadCert = async () => {
    if (!enrollment?.certificate_id) return;
    setDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;
      // Outer border
      doc.setDrawColor(5, 150, 105); doc.setLineWidth(2); doc.rect(8, 8, W - 16, H - 16);
      doc.setLineWidth(0.5); doc.rect(12, 12, W - 24, H - 24);
      // Title
      doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 78, 59); doc.setFontSize(36);
      doc.text(t('cert_pdf_title'), W / 2, 50, { align: 'center' });
      // mAgri logo text
      doc.setFontSize(14); doc.setTextColor(5, 150, 105);
      doc.text('🌱 mAgri  ·  Brastorne Inc.', W / 2, 65, { align: 'center' });
      // Intro
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); doc.setFontSize(14);
      doc.text(t('cert_pdf_intro'), W / 2, 88, { align: 'center' });
      // Name
      doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 95, 70); doc.setFontSize(28);
      doc.text(user.name || user.email, W / 2, 105, { align: 'center' });
      // Underline name
      doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.5);
      const nameW = doc.getTextWidth(user.name || user.email);
      doc.line(W / 2 - nameW / 2 - 5, 108, W / 2 + nameW / 2 + 5, 108);
      // Course
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60); doc.setFontSize(14);
      doc.text(t('cert_pdf_has'), W / 2, 122, { align: 'center' });
      doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 20); doc.setFontSize(18);
      const courseTitle = course.title;
      const titleLines = doc.splitTextToSize(courseTitle, W - 60);
      doc.text(titleLines, W / 2, 134, { align: 'center' });
      // Date
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80); doc.setFontSize(12);
      const issuedDate = new Date(enrollment.completed_at || Date.now());
      const dateStr = issuedDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : (lang === 'tn' ? 'en-BW' : 'en-GB'), { year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`${t('cert_pdf_on')} ${dateStr}`, W / 2, 156, { align: 'center' });
      // Cert ID + Issuer
      doc.setFontSize(9); doc.setTextColor(120, 120, 120);
      doc.text(`${t('cert_pdf_id')}: ${enrollment.certificate_id}`, W / 2, 178, { align: 'center' });
      doc.text(t('cert_pdf_issued'), W / 2, 186, { align: 'center' });
      // Save
      doc.save(`mAgri-Certificate-${enrollment.certificate_id.slice(0, 8)}.pdf`);
      toast.success(t('cert_download'));
      window.gtag?.('event', 'certificate_download', { course_id: courseId });
    } catch (e) { console.error(e); toast.error(e.message); } finally { setDownloadingPdf(false); }
  };

  return (
    <div className="container py-6">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />{t('course_back')}</Button>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-video bg-black">
              {active && (
                <video key={active._id} src={active.video_url} controls className="w-full h-full" poster={course.thumbnail}>
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('course_label')} · Lecture {activeIdx + 1}/{lectures.length}</p>
                  <h2 className="text-xl font-bold mt-1">{active?.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={markWatched} disabled={watched.has(active?._id)} className="bg-emerald-600 hover:bg-emerald-700">
                    {watched.has(active?._id) ? <><CheckCircle2 className="w-4 h-4 mr-1" />Watched</> : <><PlayCircle className="w-4 h-4 mr-1" />{t('course_video_done')}</>}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {enrollment?.completed_at && (
            <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-300">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0"><Award className="w-7 h-7 text-white" /></div>
                <div className="flex-1">
                  <div className="font-bold text-amber-900">{t('cert_title')}</div>
                  <div className="text-xs text-amber-800 mt-0.5">ID: {enrollment.certificate_id}</div>
                  <div className="text-xs text-amber-700">{new Date(enrollment.completed_at).toLocaleDateString()}</div>
                </div>
                <Button onClick={downloadCert} disabled={downloadingPdf} className="bg-amber-600 hover:bg-amber-700">
                  {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Award className="w-4 h-4 mr-1" />}
                  {t('cert_download')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{course.title}</CardTitle>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{t('course_progress')}</span><span className="font-semibold">{progress}%</span></div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {lectures.map((l, i) => {
                  const w = watched.has(l._id);
                  const isActive = i === activeIdx;
                  return (
                    <li key={l._id}>
                      <button onClick={() => setActiveIdx(i)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 transition ${isActive ? 'bg-emerald-50' : ''}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${w ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          {w ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${isActive ? 'text-emerald-800' : 'text-gray-900'}`}>{l.title}</div>
                          <div className="text-[10px] text-muted-foreground">{Math.floor((l.duration_sec || 0) / 60)}m {((l.duration_sec || 0) % 60)}s</div>
                        </div>
                        {isActive && <PlayCircle className="w-4 h-4 text-emerald-600" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ============ BLOG LIST ============
function BlogListView() {
  const { t } = useT();
  const [posts, setPosts] = useState([]);
  useEffect(() => { api('/blogs').then(r => setPosts(r.posts || [])); }, []);
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">{t('blog_title')}</h1>
      <p className="text-muted-foreground mb-8">{t('blog_desc')}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{posts.map(p => <BlogCard key={p._id} post={p} />)}</div>
    </div>
  );
}

// ============ ADMIN ============
function AdminView() {
  const { t } = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const r = await api('/admin/analytics'); setData(r); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const reconcile = async () => { try { const r = await api('/admin/reconcile', { method: 'POST' }); toast.success(`Reconciled ${r.reconciled}`); await load(); } catch (e) { toast.error(e.message); } };
  if (!data) return <div className="container py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const kpis = [
    { label: t('kpi_users'), value: data.summary.total_users, icon: Users },
    { label: t('kpi_calls'), value: data.summary.total_ai_calls, icon: Sprout },
    { label: t('kpi_revenue'), value: data.summary.total_revenue_bwp?.toFixed(2), icon: TrendingUp },
    { label: t('kpi_completions'), value: data.summary.total_completions, icon: GraduationCap },
    { label: t('kpi_failed'), value: data.summary.failed_topups, icon: AlertCircle },
    { label: t('kpi_pending'), value: data.summary.pending_topups, icon: Loader2 },
  ];
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">{t('admin_title')}</h1><p className="text-muted-foreground">{t('admin_desc')}</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />{t('admin_refresh')}</Button><Button onClick={reconcile}>{t('admin_reconcile')}</Button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (<Card key={k.label}><CardContent className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</span><k.icon className="w-4 h-4 text-emerald-600" /></div><div className="text-2xl font-bold mt-1">{k.value}</div></CardContent></Card>))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t('chart_signups')}</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.signups_daily.map(d => ({ date: d._id, signups: d.count }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} allowDecimals={false} /><Tooltip /><Bar dataKey="signups" fill="#059669" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t('chart_ai')}</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.ai_daily.map(d => ({ date: d._id, tokens: (d.input_tokens || 0) + (d.output_tokens || 0), cost: d.cost_bwp || 0 }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis yAxisId="l" fontSize={10} /><YAxis yAxisId="r" orientation="right" fontSize={10} /><Tooltip /><Legend /><Line yAxisId="l" type="monotone" dataKey="tokens" stroke="#059669" /><Line yAxisId="r" type="monotone" dataKey="cost" stroke="#f97316" /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="text-base">{t('chart_revenue')}</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.revenue_daily.map(d => ({ date: d._id, revenue: d.revenue }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="revenue" fill="#f97316" /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{t('table_top_users')}</CardTitle></CardHeader><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-2 text-left">{t('col_user')}</th><th className="p-2 text-right">{t('col_calls')}</th><th className="p-2 text-right">{t('th_cost')}</th></tr></thead>
            <tbody>
              {data.top_users.map(u => (<tr key={u._id} className="border-t"><td className="p-2 truncate max-w-[180px]">{u.email || u._id}</td><td className="p-2 text-right">{u.calls}</td><td className="p-2 text-right font-semibold">{bwp(u.cost)}</td></tr>))}
            </tbody>
          </table>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{t('table_recent')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 uppercase text-gray-500"><tr><th className="p-2 text-left">{t('col_when')}</th><th className="p-2 text-left">{t('col_user')}</th><th className="p-2 text-left">{t('th_model')}</th><th className="p-2 text-right">{t('th_in')}</th><th className="p-2 text-right">{t('th_out')}</th><th className="p-2 text-right">{t('th_cost')}</th><th className="p-2 text-left">{t('th_prompt')}</th><th className="p-2">{t('th_status')}</th></tr></thead>
            <tbody>
              {data.recent_logs.map(l => (
                <tr key={l._id} className="border-t">
                  <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-2 truncate max-w-[160px]">{l.user_email || l.user_id}</td>
                  <td className="p-2 font-mono">{l.model || '—'}</td>
                  <td className="p-2 text-right">{l.input_tokens || 0}</td>
                  <td className="p-2 text-right">{l.output_tokens || 0}</td>
                  <td className="p-2 text-right font-semibold">{bwp(l.cost_bwp || 0)}</td>
                  <td className="p-2 truncate max-w-[220px]">{l.prompt_preview || (l.had_image ? '[image]' : '—')}</td>
                  <td className="p-2">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ FOOTER ============
function Footer({ goto }) {
  const { t } = useT();
  return (
    <footer className="mt-16 border-t bg-emerald-950 text-emerald-100">
      <div className="container py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Sprout className="w-4 h-4 text-white" /></div><span className="font-bold text-white">mAgri</span></div>
          <p className="text-emerald-200 text-xs">{t('footer_about')}</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">{t('footer_platform')}</h4>
          <ul className="space-y-1">
            <li><button onClick={() => goto('courses')} className="hover:underline">{t('nav_courses')}</button></li>
            <li><button onClick={() => goto('blog')} className="hover:underline">{t('nav_blog')}</button></li>
            <li><button onClick={() => goto('diagnose')} className="hover:underline">{t('nav_diagnose')}</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">{t('footer_account')}</h4>
          <ul className="space-y-1"><li><button onClick={() => goto('wallet')} className="hover:underline">{t('nav_wallet')}</button></li></ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">{t('footer_seo')}</h4>
          <ul className="space-y-1 text-xs"><li><a href="/sitemap.xml" className="hover:underline">/sitemap.xml</a></li><li><a href="/robots.txt" className="hover:underline">/robots.txt</a></li></ul>
        </div>
      </div>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300">© {new Date().getFullYear()} Brastorne Inc. — All rights reserved.</div>
    </footer>
  );
}
