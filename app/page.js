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
import {
  Sprout, BarChart3, Wallet, BookOpen, LogIn, LogOut, UserPlus, Upload,
  Loader2, CheckCircle2, XCircle, RefreshCw, Smartphone, Leaf, GraduationCap, TrendingUp, FileText, Users, AlertCircle, Coins,
} from 'lucide-react';

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

export default function Home() {
  const [view, setView] = useState('home');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // boot
  useEffect(() => {
    (async () => {
      try {
        const { user } = await api('/me');
        setUser(user);
      } catch {}
    })();
    // read URL query ?view=
    try {
      const u = new URL(window.location.href);
      const v = u.searchParams.get('view');
      if (v) setView(v);
    } catch {}
  }, []);

  const refreshUser = async () => {
    try {
      const { user } = await api('/me');
      setUser(user);
    } catch { setUser(null); }
  };

  const goto = (v) => {
    setView(v);
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href);
      if (v === 'home') u.searchParams.delete('view'); else u.searchParams.set('view', v);
      window.history.replaceState({}, '', u.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.gtag?.('event', 'view_change', { view: v });
    }
  };

  const requireAuth = (next) => {
    if (!user) { setAuthMode('login'); setAuthOpen(true); return false; }
    if (next) setView(next);
    return true;
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    goto('home');
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header view={view} goto={goto} user={user} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} onSignup={() => { setAuthMode('signup'); setAuthOpen(true); }} onLogout={logout} />

      <main className="flex-1">
        {view === 'home' && <HomeView goto={goto} onStart={() => requireAuth('diagnose')} />}
        {view === 'diagnose' && (user ? <DiagnoseView user={user} refreshUser={refreshUser} onNeedAuth={() => { setAuthMode('login'); setAuthOpen(true); }} /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />)}
        {view === 'wallet' && (user ? <WalletView user={user} refreshUser={refreshUser} /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} />)}
        {view === 'courses' && <CoursesView user={user} onNeedAuth={() => { setAuthMode('login'); setAuthOpen(true); }} refreshUser={refreshUser} />}
        {view === 'blog' && <BlogListView />}
        {view === 'admin' && (user?.is_admin ? <AdminView /> : <AuthWall goto={goto} onLogin={() => { setAuthMode('login'); setAuthOpen(true); }} adminHint />)}
      </main>

      <Footer goto={goto} />

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        mode={authMode}
        setMode={setAuthMode}
        onSuccess={async (u) => { setUser(u); setAuthOpen(false); toast.success(`Welcome, ${u.name}!`); window.gtag?.('event', 'login', { method: 'email' }); }}
      />
    </div>
  );
}

// ============ HEADER ============
function Header({ view, goto, user, onLogin, onSignup, onLogout }) {
  const nav = [
    { key: 'home', label: 'Home' },
    { key: 'diagnose', label: 'AI Diagnose' },
    { key: 'courses', label: 'Courses' },
    { key: 'blog', label: 'Blog' },
    { key: 'wallet', label: 'Wallet' },
  ];
  if (user?.is_admin) nav.push({ key: 'admin', label: 'Admin' });
  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between h-16">
        <button onClick={() => goto('home')} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Sprout className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl text-emerald-900 tracking-tight">mAgri</span>
          <Badge variant="secondary" className="hidden md:inline-flex bg-emerald-50 text-emerald-700 border-emerald-200">Botswana</Badge>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(n => (
            <button
              key={n.key}
              onClick={() => goto(n.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${view === n.key ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Coins className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">{bwp(user.balance_bwp)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="w-4 h-4 mr-1" />Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onLogin}><LogIn className="w-4 h-4 mr-1" />Sign in</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onSignup}><UserPlus className="w-4 h-4 mr-1" />Sign up</Button>
            </>
          )}
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden border-t bg-white">
        <div className="container flex overflow-x-auto gap-1 py-2">
          {nav.map(n => (
            <button key={n.key} onClick={() => goto(n.key)} className={`px-3 py-1 rounded text-xs whitespace-nowrap ${view === n.key ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600'}`}>{n.label}</button>
          ))}
        </div>
      </div>
    </header>
  );
}

// ============ HOME ============
function HomeView({ goto, onStart }) {
  const [insights, setInsights] = useState([]);
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [a, b, c] = await Promise.all([api('/insights'), api('/courses'), api('/blogs')]);
        setInsights(a.insights || []);
        setCourses(b.courses || []);
        setPosts(c.posts || []);
      } catch (e) { console.error(e); }
    })();
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="African farmer in field" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-900/70 to-emerald-800/40" />
        </div>
        <div className="relative container py-20 md:py-28 text-white">
          <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-300/40 mb-5">By Brastorne Inc.</Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl">
            Empowering Farmers with Knowledge That Grows With You
          </h1>
          <p className="mt-5 text-lg md:text-xl max-w-2xl text-emerald-50">
            All-in-one access to localised Courses, insightful Blogs, real Farmer Insights — and AI-powered crop & livestock Diagnostics, pay-as-you-go with Orange Money.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white" onClick={onStart}>
              <Smartphone className="w-4 h-4 mr-2" /> Try AI Diagnose
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20" onClick={() => goto('courses')}>
              <GraduationCap className="w-4 h-4 mr-2" /> Browse Courses
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl text-emerald-50">
            {[
              { k: '3', v: 'Courses' },
              { k: '3', v: 'Farmer stories' },
              { k: 'AI', v: 'Diagnose' },
            ].map(s => (
              <div key={s.v} className="bg-white/10 backdrop-blur rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">{s.k}</div>
                <div className="text-xs uppercase tracking-wider">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Diagnose feature highlight */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 mb-3">New</Badge>
            <h2 className="text-3xl font-bold mb-3">AI Diagnose for crops &amp; livestock</h2>
            <p className="text-muted-foreground mb-4">
              Upload a photo of a sick plant or animal, add a short description, and get an expert analysis in seconds. Each call is tracked, logged, and billed by real AI token usage — no hidden cost.
            </p>
            <ul className="space-y-2 text-sm mb-6">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> Powered by Claude Sonnet 4.5 vision</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> Pay-as-you-go in Botswana Pula (BWP)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> Orange Money top-ups with retries</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" /> Full usage log + receipts</li>
            </ul>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onStart}>Start a diagnosis</Button>
          </div>
          <img src={DIAGNOSE_IMG} alt="Farmer using a phone" className="rounded-xl shadow-xl aspect-video object-cover" />
        </div>
      </section>

      {/* Farmer insights */}
      <section className="bg-emerald-50/60 py-16">
        <div className="container">
          <SectionHeader title="Farmer Insights" cta="View all" onCta={() => goto('blog')} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {insights.map(f => (
              <Card key={f._id} className="overflow-hidden border-emerald-100">
                <img src={f.thumbnail} alt={f.name} className="w-full aspect-[4/3] object-cover" />
                <CardHeader>
                  <CardTitle className="text-lg">{f.name}</CardTitle>
                  <CardDescription>{f.location}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.story}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="container py-16">
        <SectionHeader title="Courses" cta="View all" onCta={() => goto('courses')} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(c => <CourseCard key={c._id} course={c} onOpen={() => goto('courses')} />)}
        </div>
      </section>

      {/* Blogs */}
      <section className="bg-gray-50 py-16">
        <div className="container">
          <SectionHeader title="Blogs" cta="View all" onCta={() => goto('blog')} />
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

function CourseCard({ course, onOpen, enrolled, onEnroll, onComplete }) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition flex flex-col">
      <img src={course.thumbnail} alt={course.title} className="w-full aspect-[16/10] object-cover" />
      <CardHeader className="pb-2">
        <Badge variant="outline" className="w-fit text-emerald-700 border-emerald-300 bg-emerald-50">Course</Badge>
        <CardTitle className="text-base leading-snug">{course.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground flex-1">{course.excerpt}</CardContent>
      <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{course.duration_min || 'N/A'} min · {course.lectures || 16} lectures</span>
        {onEnroll && !enrolled && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onEnroll}>Enroll</Button>}
        {enrolled && !enrolled.completed_at && onComplete && <Button size="sm" variant="outline" onClick={onComplete}>Mark complete</Button>}
        {enrolled?.completed_at && <Badge className="bg-emerald-100 text-emerald-800">✓ Completed</Badge>}
        {!onEnroll && onOpen && <Button size="sm" variant="ghost" onClick={onOpen}>More info</Button>}
      </CardFooter>
    </Card>
  );
}

function BlogCard({ post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <Card className="overflow-hidden hover:shadow-md transition h-full">
        <img src={post.thumbnail} alt={post.title} className="w-full aspect-[16/10] object-cover" />
        <CardHeader>
          <CardTitle className="text-base leading-snug line-clamp-2">{post.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</CardContent>
      </Card>
    </Link>
  );
}

// ============ AUTH ============
function AuthWall({ goto, onLogin, adminHint }) {
  return (
    <div className="container py-20 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
          <LogIn className="w-6 h-6 text-emerald-700" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
        <p className="text-muted-foreground mb-6">This area is protected. Please sign in or create a free account to continue.</p>
        {adminHint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">Admin credentials: <code>admin@magri.africa / admin123</code></p>}
        <div className="flex gap-3 justify-center">
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onLogin}>Sign in</Button>
          <Button variant="outline" onClick={() => goto('home')}>Back home</Button>
        </div>
      </div>
    </div>
  );
}

function AuthDialog({ open, onOpenChange, mode, setMode, onSuccess }) {
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
    } catch (e) {
      toast.error(e.message || 'Auth failed');
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'signup' ? 'Create your mAgri account' : 'Sign in to mAgri'}</DialogTitle>
          <DialogDescription>
            {mode === 'signup' ? 'Starts with BWP 50 free AI credit.' : 'Welcome back, farmer.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {mode === 'signup' && (
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading} onClick={submit}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {mode === 'signup' ? 'Sign up' : 'Sign in'}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            {mode === 'signup' ? (
              <>Already have an account? <button className="text-emerald-700 underline" onClick={() => setMode('login')}>Sign in</button></>
            ) : (
              <>New here? <button className="text-emerald-700 underline" onClick={() => setMode('signup')}>Create account</button></>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">Admin: <code>admin@magri.africa / admin123</code></p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ DIAGNOSE ============
function DiagnoseView({ user, refreshUser, onNeedAuth }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCost, setLastCost] = useState(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const pickImage = async (file) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { toast.error('Image too large (max 6MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!text && !image) { toast.error('Add a question or image'); return; }
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
      if (e.status === 402) {
        toast.error('Insufficient balance — please top-up your wallet.');
      } else {
        toast.error(e.message || 'Diagnose failed');
      }
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ Error: ${e.message}`, error: true }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-8 grid md:grid-cols-3 gap-6">
      {/* Chat */}
      <div className="md:col-span-2">
        <Card className="h-[calc(100vh-12rem)] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2"><Leaf className="w-5 h-5 text-emerald-600" />AI Crop &amp; Livestock Diagnose</CardTitle>
            <CardDescription>Describe symptoms or upload a photo. Powered by Claude Sonnet 4.5 vision.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Sprout className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
                <p className="font-medium">Start a new diagnosis</p>
                <p className="text-xs">Try: "My maize leaves have yellow streaks" or upload a photo.</p>
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
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </CardContent>
          <div className="border-t p-3">
            {image && (
              <div className="relative w-28 mb-2">
                <img src={image} alt="pending" className="rounded aspect-square object-cover" />
                <button onClick={() => setImage(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 text-white text-xs">×</button>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Button variant="outline" size="icon" onClick={() => fileRef.current?.click()} title="Attach photo"><Upload className="w-4 h-4" /></Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Describe the issue, ask a question, or request diagnosis…"
                className="min-h-[44px] max-h-32"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
              />
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={send} disabled={loading}>Send</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Ctrl/⌘ + Enter to send · Each call is charged by AI tokens used.</p>
          </div>
        </Card>
      </div>

      {/* Side panel */}
      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" />Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{bwp(user.balance_bwp)}</div>
            <p className="text-xs text-muted-foreground mt-1">Available balance</p>
          </CardContent>
        </Card>

        {lastCost && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Last call</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div className="flex justify-between"><span>Input tokens</span><span className="font-mono">{lastCost.input_tokens}</span></div>
              <div className="flex justify-between"><span>Output tokens</span><span className="font-mono">{lastCost.output_tokens}</span></div>
              <div className="flex justify-between font-semibold pt-1 border-t"><span>Cost</span><span>{bwp(lastCost.cost_bwp)}</span></div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader><CardTitle className="text-sm">How pricing works</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-1 text-emerald-900">
            <div>Input: <b>BWP 0.10 / 1K tokens</b></div>
            <div>Output: <b>BWP 0.50 / 1K tokens</b></div>
            <div className="pt-1 text-emerald-700">Top-up via Orange Money in the Wallet tab.</div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

// ============ WALLET ============
function WalletView({ user, refreshUser }) {
  const [txs, setTxs] = useState([]);
  const [usage, setUsage] = useState({ logs: [], totals: {} });
  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState('50');
  const [msisdn, setMsisdn] = useState('+267 71 234 567');
  const [activeTx, setActiveTx] = useState(null);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  const load = async () => {
    const [a, b] = await Promise.all([api('/billing/transactions'), api('/usage')]);
    setTxs(a.transactions || []);
    setUsage(b);
  };
  useEffect(() => { load(); }, []);

  const startTopup = async () => {
    try {
      const amt = parseFloat(amount);
      const res = await api('/billing/topup', { method: 'POST', body: { amount_bwp: amt, msisdn } });
      setActiveTx(res);
      setCheckoutStatus('pending');
      setTopupOpen(true);
      // poll
      const poll = async () => {
        try {
          const r = await api(`/billing/tx/${res.tx_id}`);
          setActiveTx(old => ({ ...old, ...r.tx }));
          if (r.tx.status === 'success') {
            setCheckoutStatus('success');
            toast.success(`Wallet credited with ${bwp(r.tx.amount_bwp)}`);
            await refreshUser(); await load();
            window.gtag?.('event', 'topup_success', { amount_bwp: r.tx.amount_bwp });
          } else if (r.tx.status === 'failed') {
            setCheckoutStatus('failed');
            toast.error('Payment failed: ' + (r.tx.failure_reason || 'Unknown'));
            await load();
            window.gtag?.('event', 'topup_failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (e) { console.error(e); }
      };
      setTimeout(poll, 1500);
    } catch (e) { toast.error(e.message); }
  };

  const retry = async (txId) => {
    try {
      const res = await api(`/billing/retry/${txId}`, { method: 'POST' });
      toast.info('Retry initiated');
      setActiveTx({ tx_id: txId, amount_bwp: txs.find(t => t._id === txId)?.amount_bwp });
      setCheckoutStatus('pending');
      setTopupOpen(true);
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
          <CardHeader>
            <CardDescription className="text-emerald-100">Current balance</CardDescription>
            <CardTitle className="text-4xl">{bwp(user.balance_bwp)}</CardTitle>
          </CardHeader>
          <CardFooter>
            <Button className="bg-white text-emerald-800 hover:bg-emerald-50" onClick={() => setTopupOpen(true)}>
              <Smartphone className="w-4 h-4 mr-2" /> Top up with Orange Money
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader><CardDescription>AI calls (all time)</CardDescription><CardTitle className="text-3xl">{usage.totals?.calls || 0}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            In {usage.totals?.total_input || 0} / Out {usage.totals?.total_output || 0} tokens
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>AI spend (all time)</CardDescription><CardTitle className="text-3xl">{bwp(usage.totals?.total_cost)}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Billed per-token at published rates</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tx">
        <TabsList>
          <TabsTrigger value="tx">Transactions</TabsTrigger>
          <TabsTrigger value="logs">AI Usage Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="tx">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description / Ref</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {txs.map(t => (
                    <tr key={t._id} className="border-t">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        {t.type === 'topup' ? <Badge className="bg-emerald-100 text-emerald-800">Top-up</Badge> : <Badge variant="secondary">AI debit</Badge>}
                      </td>
                      <td className="p-3">
                        {t.description || t.orange_ref || '—'}
                        {t.failure_reason && <div className="text-xs text-red-600">{t.failure_reason}</div>}
                      </td>
                      <td className={`p-3 text-right font-mono ${t.type === 'topup' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {t.type === 'topup' ? '+' : '-'}{bwp(t.amount_bwp)}
                      </td>
                      <td className="p-3">
                        {t.status === 'success' && <Badge className="bg-emerald-100 text-emerald-800">✓ Success</Badge>}
                        {t.status === 'pending' && <Badge className="bg-amber-100 text-amber-800">⏳ Pending</Badge>}
                        {t.status === 'failed' && <Badge className="bg-red-100 text-red-800">✗ Failed</Badge>}
                      </td>
                      <td className="p-3">
                        {t.status === 'failed' && t.type === 'topup' && (
                          <Button size="sm" variant="outline" onClick={() => retry(t._id)}><RefreshCw className="w-3 h-3 mr-1" />Retry</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {txs.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No transactions yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr><th className="p-3">Date</th><th className="p-3">Model</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3">Cost</th><th className="p-3">Prompt</th><th className="p-3">Status</th></tr>
                </thead>
                <tbody>
                  {usage.logs?.map(l => (
                    <tr key={l._id} className="border-t">
                      <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-3 text-xs font-mono">{l.model}</td>
                      <td className="p-3 text-xs">{l.input_tokens}</td>
                      <td className="p-3 text-xs">{l.output_tokens}</td>
                      <td className="p-3 text-xs font-semibold">{bwp(l.cost_bwp)}</td>
                      <td className="p-3 text-xs truncate max-w-xs">{l.prompt_preview || (l.had_image ? '[image]' : '—')}</td>
                      <td className="p-3">
                        {l.status === 'debited' ? <Badge className="bg-emerald-100 text-emerald-800 text-xs">debited</Badge> :
                         l.status === 'failed' ? <Badge className="bg-red-100 text-red-800 text-xs">failed</Badge> :
                         <Badge className="bg-amber-100 text-amber-800 text-xs">{l.status}</Badge>}
                      </td>
                    </tr>
                  ))}
                  {(!usage.logs || usage.logs.length === 0) && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">No AI calls yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Topup dialog */}
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-orange-500" />Orange Money top-up</DialogTitle>
            <DialogDescription>Funds will be added to your mAgri wallet on confirmation.</DialogDescription>
          </DialogHeader>
          {!activeTx && (
            <div className="space-y-3">
              <div>
                <Label>Amount (BWP)</Label>
                <Input type="number" min={1} max={10000} value={amount} onChange={e => setAmount(e.target.value)} />
                <div className="flex gap-2 mt-2">
                  {[20, 50, 100, 200].map(v => <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(String(v))}>{v}</Button>)}
                </div>
              </div>
              <div>
                <Label>Orange Money number</Label>
                <Input value={msisdn} onChange={e => setMsisdn(e.target.value)} />
              </div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={startTopup}>
                Pay {bwp(parseFloat(amount || 0))} with Orange Money
              </Button>
              <p className="text-xs text-center text-muted-foreground">Orange API integration is MOCKED in this build — real tokens tracked, simulated checkout.</p>
            </div>
          )}
          {activeTx && (
            <div className="space-y-4 py-4 text-center">
              {checkoutStatus === 'pending' && (
                <>
                  <div className="w-20 h-20 rounded-full bg-orange-100 mx-auto flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                  </div>
                  <div>
                    <div className="font-semibold">Waiting for confirmation…</div>
                    <p className="text-xs text-muted-foreground mt-1">Enter your Orange Money PIN on your phone. Ref: {activeTx.orange_ref}</p>
                  </div>
                  <Progress value={60} />
                </>
              )}
              {checkoutStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
                  <div>
                    <div className="font-bold text-lg">Payment successful</div>
                    <p className="text-sm text-muted-foreground">{bwp(activeTx.amount_bwp)} added to your wallet.</p>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { setTopupOpen(false); setActiveTx(null); setCheckoutStatus(null); }}>Done</Button>
                </>
              )}
              {checkoutStatus === 'failed' && (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto" />
                  <div>
                    <div className="font-bold text-lg">Payment failed</div>
                    <p className="text-sm text-muted-foreground">{activeTx.failure_reason || 'The provider rejected the request.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setTopupOpen(false); setActiveTx(null); setCheckoutStatus(null); }}>Close</Button>
                    <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => retry(activeTx._id || activeTx.tx_id)}>Retry</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ COURSES ============
function CoursesView({ user, onNeedAuth, refreshUser }) {
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const load = async () => {
    const a = await api('/courses');
    setCourses(a.courses || []);
    if (user) {
      try { const b = await api('/courses/mine'); setEnrollments(b.enrollments || []); } catch {}
    }
  };
  useEffect(() => { load(); }, [user?._id]);

  const enroll = async (course_id) => {
    if (!user) return onNeedAuth();
    try {
      await api('/courses/enroll', { method: 'POST', body: { course_id } });
      toast.success('Enrolled');
      await load();
      window.gtag?.('event', 'course_enroll', { course_id });
    } catch (e) { toast.error(e.message); }
  };
  const complete = async (course_id) => {
    try {
      const r = await api('/courses/complete', { method: 'POST', body: { course_id } });
      toast.success(`Completed! Certificate: ${r.certificate_id.slice(0, 8)}`);
      await load();
      window.gtag?.('event', 'course_complete', { course_id });
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Courses</h1>
      <p className="text-muted-foreground mb-8">Localised learning for Botswana smallholder farmers.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map(c => {
          const e = enrollments.find(x => x.course_id === c._id);
          return (
            <CourseCard
              key={c._id}
              course={c}
              enrolled={e}
              onEnroll={() => enroll(c._id)}
              onComplete={() => complete(c._id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============ BLOG LIST ============
function BlogListView() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api('/blogs').then(r => setPosts(r.posts || [])); }, []);
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Blog</h1>
      <p className="text-muted-foreground mb-8">Practical guides, success stories, and market insights for Botswana farmers.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map(p => <BlogCard key={p._id} post={p} />)}
      </div>
    </div>
  );
}

// ============ ADMIN ============
function AdminView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api('/admin/analytics'); setData(r); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reconcile = async () => {
    try { const r = await api('/admin/reconcile', { method: 'POST' }); toast.success(`Reconciled ${r.reconciled} stuck tx`); await load(); } catch (e) { toast.error(e.message); }
  };

  if (!data) return <div className="container py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const kpis = [
    { label: 'Total users', value: data.summary.total_users, icon: Users },
    { label: 'AI calls', value: data.summary.total_ai_calls, icon: Sprout },
    { label: 'Revenue (BWP)', value: data.summary.total_revenue_bwp?.toFixed(2), icon: TrendingUp },
    { label: 'Course completions', value: data.summary.total_completions, icon: GraduationCap },
    { label: 'Failed top-ups', value: data.summary.failed_topups, icon: AlertCircle },
    { label: 'Pending top-ups', value: data.summary.pending_topups, icon: Loader2 },
  ];

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin dashboard</h1>
          <p className="text-muted-foreground">Internal visibility, AI logs, and revenue reconciliation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button onClick={reconcile}>Run reconciliation</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</span>
                <k.icon className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold mt-1">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Daily signups (30d)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.signups_daily.map(d => ({ date: d._id, signups: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="signups" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">AI usage (tokens &amp; cost)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.ai_daily.map(d => ({ date: d._id, tokens: (d.input_tokens || 0) + (d.output_tokens || 0), cost: d.cost_bwp || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis yAxisId="l" fontSize={10} />
                <YAxis yAxisId="r" orientation="right" fontSize={10} />
                <Tooltip />
                <Legend />
                <Line yAxisId="l" type="monotone" dataKey="tokens" stroke="#059669" />
                <Line yAxisId="r" type="monotone" dataKey="cost" stroke="#f97316" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue (daily BWP)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue_daily.map(d => ({ date: d._id, revenue: d.revenue }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top AI users</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-2 text-left">User</th><th className="p-2 text-right">Calls</th><th className="p-2 text-right">Cost</th></tr></thead>
              <tbody>
                {data.top_users.map(u => (
                  <tr key={u._id} className="border-t">
                    <td className="p-2 truncate max-w-[180px]">{u.email || u._id}</td>
                    <td className="p-2 text-right">{u.calls}</td>
                    <td className="p-2 text-right font-semibold">{bwp(u.cost)}</td>
                  </tr>
                ))}
                {data.top_users.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No usage yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent AI calls</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 uppercase text-gray-500">
              <tr><th className="p-2 text-left">When</th><th className="p-2 text-left">User</th><th className="p-2 text-left">Model</th><th className="p-2 text-right">In</th><th className="p-2 text-right">Out</th><th className="p-2 text-right">Cost</th><th className="p-2 text-left">Prompt</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {data.recent_logs.map(l => (
                <tr key={l._id} className="border-t">
                  <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-2 truncate max-w-[160px]">{l.user_email || l.user_id}</td>
                  <td className="p-2 font-mono">{l.model}</td>
                  <td className="p-2 text-right">{l.input_tokens}</td>
                  <td className="p-2 text-right">{l.output_tokens}</td>
                  <td className="p-2 text-right font-semibold">{bwp(l.cost_bwp)}</td>
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
  return (
    <footer className="mt-16 border-t bg-emerald-950 text-emerald-100">
      <div className="container py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Sprout className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-white">mAgri</span>
          </div>
          <p className="text-emerald-200 text-xs">Empowering Batswana farmers with localised knowledge and AI-powered tools. Built by Brastorne Inc.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Platform</h4>
          <ul className="space-y-1">
            <li><button onClick={() => goto('courses')} className="hover:underline">Courses</button></li>
            <li><button onClick={() => goto('blog')} className="hover:underline">Blog</button></li>
            <li><button onClick={() => goto('diagnose')} className="hover:underline">AI Diagnose</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Account</h4>
          <ul className="space-y-1">
            <li><button onClick={() => goto('wallet')} className="hover:underline">Wallet</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">SEO &amp; Robots</h4>
          <ul className="space-y-1 text-xs">
            <li><a href="/sitemap.xml" className="hover:underline">/sitemap.xml</a></li>
            <li><a href="/robots.txt" className="hover:underline">/robots.txt</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-emerald-900 py-4 text-center text-xs text-emerald-300">
        © {new Date().getFullYear()} Brastorne Inc. — All rights reserved.
      </div>
    </footer>
  );
}
