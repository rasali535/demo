import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongo';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============ PRICING (BWP = Botswana Pula) ============
const PRICE_INPUT_PER_1K_BWP = 0.10;
const PRICE_OUTPUT_PER_1K_BWP = 0.50;
const STARTING_BALANCE_BWP = 50;
const COOKIE_NAME = 'magri_session';

// ============ HELPERS ============
function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

function err(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

async function getUserFromCookie() {
  try {
    const jar = cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const db = await getDb();
    const session = await db.collection('sessions').findOne({ _id: token });
    if (!session) return null;
    const user = await db.collection('users').findOne({ _id: session.user_id });
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  } catch (e) {
    return null;
  }
}

function setSessionCookie(resp, token) {
  resp.cookies.set(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
  return resp;
}

function computeCostBWP(inputTokens, outputTokens) {
  const cost =
    (inputTokens / 1000) * PRICE_INPUT_PER_1K_BWP +
    (outputTokens / 1000) * PRICE_OUTPUT_PER_1K_BWP;
  return Math.round(cost * 10000) / 10000;
}

function callPythonLLM(payload) {
  // Now a pure-Node call to Emergent's OpenAI-compatible LLM proxy.
  // No Python required — works on any Node host (Hostinger, Vercel, Render, etc.).
  return new Promise(async (resolve) => {
    try {
      const apiKey = payload.api_key || process.env.EMERGENT_LLM_KEY;
      const provider = payload.provider || 'anthropic';
      const model = payload.model || 'claude-sonnet-4-5-20250929';
      const baseUrl = process.env.LLM_BASE_URL || 'https://integrations.emergentagent.com/llm/v1';
      const sysMsg = payload.system_message || 'You are a helpful assistant.';
      const history = payload.history || [];
      const text = payload.text || '';
      const imageB64 = payload.image_base64 || null;

      const messages = [{ role: 'system', content: sysMsg }];
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') {
          messages.push({ role: m.role, content: m.content });
        }
      }
      // Build current user message (multimodal if image)
      if (imageB64) {
        let dataUrl = imageB64;
        if (!dataUrl.startsWith('data:')) {
          // sniff mime via base64 prefix
          let mime = 'image/png';
          if (dataUrl.startsWith('/9j/')) mime = 'image/jpeg';
          else if (dataUrl.startsWith('iVBOR')) mime = 'image/png';
          else if (dataUrl.startsWith('UklGR')) mime = 'image/webp';
          dataUrl = `data:${mime};base64,${dataUrl}`;
        }
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: text || 'Please analyze this image.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        });
      } else {
        messages.push({ role: 'user', content: text });
      }

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return resolve({ ok: false, error: `LLM HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}` });
      }
      const reply = data?.choices?.[0]?.message?.content || '';
      const inputTokens = data?.usage?.prompt_tokens || 0;
      const outputTokens = data?.usage?.completion_tokens || 0;
      resolve({
        ok: true,
        reply: typeof reply === 'string' ? reply : JSON.stringify(reply),
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        model,
        provider,
      });
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

// ============ SEED DATA ============
async function ensureSeeded(db) {
  const flag = await db.collection('meta').findOne({ _id: 'seeded_v1' });
  if (flag) return;

  const now = new Date();
  const blogs = [
    {
      _id: uuidv4(),
      slug: 'conservation-agriculture-botswana',
      title: 'Success Stories: How Smallholder Farmers in Botswana Are Mastering Conservation Agriculture',
      excerpt: 'Inspiring stories of Botswana farmers who turned drought, pests, and financial barriers into profitable, resilient agribusinesses through smart practices and new policies.',
      thumbnail: 'https://images.unsplash.com/photo-1704627647734-61e38adedc4d?auto=format&fit=crop&w=1200&q=80',
      author: 'mAgri Editorial',
      tags: ['conservation', 'botswana', 'success-stories'],
      body_md: `# Conservation Agriculture in Botswana\n\nSmallholder farmers across Botswana are transforming their operations through **conservation agriculture**. This post explores three success stories and the practices that made them possible.\n\n## Why it matters\n\nBotswana's climate is increasingly unpredictable. Conservation agriculture builds resilience via:\n\n- Minimum tillage\n- Permanent soil cover\n- Crop rotation\n\n## Key metrics from three farms\n\n| Farm | Region | Yield uplift | Input cost change |\n|------|--------|--------------|-------------------|\n| Thuo Letlotlo #1 | Manyana | +42% | -18% |\n| Temo Letlotlo #7 | Lekgolobotlo | +31% | -22% |\n| Boatle Coop | Boatle Lands | +55% | -10% |\n\n## Further reading\n\nSee the official [Temo Letlotlo programme](https://www.gov.bw/) and [FAO conservation agriculture guide](https://www.fao.org/conservation-agriculture/). Also check our related post on [land preparation](/blog/sustainable-land-preparation).\n\n> "Our soils hold water for three weeks longer now.\" — Kgolagano M., Manyana\n\n### What's next\n\n1. Join a local cooperative.\n2. Apply for Thuo Letlotlo subsidies.\n3. Track your inputs and outputs monthly.`,
      published_at: now,
      updated_at: now,
    },
    {
      _id: uuidv4(),
      slug: 'budget-seeds-fertilizers-equipment',
      title: 'How to Budget for Seeds, Fertilizers, and Equipment',
      excerpt: 'A practical budgeting guide helping Botswana farmers plan inputs, invest wisely, manage risks, and adapt to the new output-based agricultural incentive system.',
      thumbnail: 'https://images.unsplash.com/photo-1567471945073-319ac8b0366a?auto=format&fit=crop&w=1200&q=80',
      author: 'mAgri Editorial',
      tags: ['budgeting', 'finance', 'inputs'],
      body_md: `# Budgeting Inputs for a Profitable Season\n\nA clear budget is the single highest-leverage tool a smallholder can build. Here's a simple framework.\n\n## The 3-bucket model\n\n1. **Seeds** (20–25%)\n2. **Fertilizer & amendments** (30–40%)\n3. **Equipment & labour** (35–50%)\n\n## Example: 2-hectare sorghum plot\n\n| Item | Unit cost (BWP) | Qty | Total |\n|------|-----------------|-----|-------|\n| Certified seed | 120 | 20 kg | 2,400 |\n| DAP fertilizer | 650 | 4 bags | 2,600 |\n| Herbicide | 180 | 3 L | 540 |\n| Ploughing | 450 | 2 ha | 900 |\n| **Total** |   |   | **6,440** |\n\n### Where to save\n\n- Use locally-produced [biofertilizers](/blog/conservation-agriculture-botswana) where suitable.\n- Bulk-buy through a cooperative.\n- Apply for the [Temo Letlotlo](https://www.gov.bw/) subsidy early.\n\n## Risk buffers\n\nAlways reserve **10–15%** of your budget for unforeseen events: drought top-up, pest outbreak, equipment repair.`,
      published_at: now,
      updated_at: now,
    },
    {
      _id: uuidv4(),
      slug: 'sustainable-land-preparation',
      title: 'Sustainable Land Preparation Methods for Botswana Smallholders',
      excerpt: 'A detailed guide helping Botswana farmers adopt conservation agriculture, use Temo Letlotlo subsidies wisely, and prepare land sustainably for climate-resilient crop production.',
      thumbnail: 'https://images.pexels.com/photos/26707731/pexels-photo-26707731.jpeg?auto=compress&cs=tinysrgb&w=1200',
      author: 'mAgri Editorial',
      tags: ['land-prep', 'sustainability', 'climate'],
      body_md: `# Sustainable Land Preparation\n\nGood preparation decides 60% of your yield. Here is the mAgri approach.\n\n## Steps\n\n1. Soil test (pH, N, P, K)\n2. Minimum tillage pass\n3. Residue retention\n4. Contour ripping for water capture\n\n## Comparison of tillage methods\n\n| Method | Fuel cost | Water retention | Erosion risk |\n|--------|-----------|-----------------|--------------|\n| Conventional plough | High | Low | High |\n| Ripping | Medium | High | Low |\n| Zero-till + cover | Low | Very high | Very low |\n\nLearn more in our [conservation agriculture post](/blog/conservation-agriculture-botswana) and explore our AI [crop diagnostic tool](/?view=diagnose) for personalised advice.`,
      published_at: now,
      updated_at: now,
    },
  ];
  await db.collection('blogs').insertMany(blogs);

  // Sample free MP4 videos used for demo lectures
  const SAMPLE_VIDEOS = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  ];
  const buildLectures = (titles) => titles.map((t, i) => ({
    _id: uuidv4(),
    title: t,
    video_url: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
    duration_sec: 180 + (i * 30) % 600,
    order: i + 1,
  }));
  const courses = [
    {
      _id: uuidv4(),
      slug: 'feed-formulation-poultry',
      title: 'Feed Formulation Basics for Poultry Farmers Using Local Ingredients in Botswana',
      excerpt: 'A practical course teaching Botswana poultry farmers how to mix affordable, nutritious feed using local ingredients.',
      thumbnail: 'https://images.unsplash.com/photo-1646451353399-e7c0ac1d9da4?auto=format&fit=crop&w=1200&q=80',
      duration_min: 55,
      level: 'Beginner',
      lectures: buildLectures([
        'Introduction to Poultry Nutrition',
        'Local Ingredients & Their Nutritional Value',
        'Calculating Energy & Protein Requirements',
        'Mixing Ratios for Layers vs Broilers',
        'Storing & Preserving Mixed Feed',
      ]),
      created_at: now,
    },
    {
      _id: uuidv4(),
      slug: 'business-plan-smallholder',
      title: 'How to Develop a Profitable Business Plan for Smallholder Farms in Botswana',
      excerpt: 'A step-by-step guide to plan, finance, operate, and grow a profitable and resilient farm business.',
      thumbnail: 'https://images.unsplash.com/photo-1579336013770-20af0d433bed?auto=format&fit=crop&w=1200&q=80',
      duration_min: 50,
      level: 'Intermediate',
      lectures: buildLectures([
        'Why a Business Plan Matters',
        'Vision, Mission & Market Analysis',
        'Cost Structure & Break-Even Analysis',
        'Funding via Thuo Letlotlo & Banks',
        'Risk Management & Resilience',
      ]),
      created_at: now,
    },
    {
      _id: uuidv4(),
      slug: 'organic-composting',
      title: 'Organic Composting & Biofertilizer Production',
      excerpt: 'Learn to make high-quality compost, produce biofertilizers, and apply sustainable soil fertility practices.',
      thumbnail: 'https://images.unsplash.com/photo-1704627647734-61e38adedc4d?auto=format&fit=crop&w=1200&q=80',
      duration_min: 48,
      level: 'Beginner',
      lectures: buildLectures([
        'Compost Science Basics',
        'Selecting Local Inputs',
        'Building Your Compost Pile',
        'Biofertilizer Production',
        'Application Rates & Timing',
      ]),
      created_at: now,
    },
  ];
  await db.collection('courses').insertMany(courses);

  const insights = [
    {
      _id: uuidv4(),
      name: 'Kgolagano Molefe',
      location: 'Manyana, Fikeng',
      thumbnail: 'https://images.unsplash.com/photo-1579336013770-20af0d433bed?auto=format&fit=crop&w=800&q=80',
      story: 'Kgolagano sustains his family through livestock farming. Despite government support, his biggest challenge is water. With financial help, he hopes to drill a borehole and expand.',
    },
    {
      _id: uuidv4(),
      name: 'Kagiso Khubidu',
      location: 'Lekgolobotlo',
      thumbnail: 'https://images.unsplash.com/photo-1646451353399-e7c0ac1d9da4?auto=format&fit=crop&w=800&q=80',
      story: 'Farming since 1987 through drought, predators and stock theft. The Thuo Letlotlo programme keeps his dream alive.',
    },
    {
      _id: uuidv4(),
      name: 'Tsamma Seikokotelo Moseki',
      location: 'Boatle Lands',
      thumbnail: 'https://images.unsplash.com/photo-1567471945073-319ac8b0366a?auto=format&fit=crop&w=800&q=80',
      story: 'Rears Tswana chickens, guinea fowls, turkeys, pigs and goats. Advocates for better market access for smallholders.',
    },
  ];
  await db.collection('insights').insertMany(insights);

  // Create default admin user
  const admin = {
    _id: uuidv4(),
    email: 'admin@magri.africa',
    password: 'admin123',
    name: 'mAgri Admin',
    balance_bwp: 500,
    is_admin: true,
    created_at: now,
  };
  await db.collection('users').insertOne(admin);

  await db.collection('meta').insertOne({ _id: 'seeded_v1', at: now });
}

// ============ ROUTER ============
async function handle(request, { params }) {
  const db = await getDb();
  await ensureSeeded(db);

  const p = Array.isArray(params?.path) ? params.path : [];
  const route = '/' + p.join('/');
  const method = request.method;

  // ---- Health ----
  if (method === 'GET' && route === '/health') {
    return json({ ok: true, service: 'mAgri', time: new Date().toISOString() });
  }

  // ---- Auth ----
  if (method === 'POST' && route === '/auth/signup') {
    const body = await request.json();
    const { email, password, name } = body;
    if (!email || !password) return err('email and password required');
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return err('email already registered', 409);
    const user = {
      _id: uuidv4(),
      email: email.toLowerCase(),
      password,
      name: name || email.split('@')[0],
      balance_bwp: STARTING_BALANCE_BWP,
      is_admin: false,
      created_at: new Date(),
    };
    await db.collection('users').insertOne(user);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ _id: token, user_id: user._id, created_at: new Date() });
    const { password: _, ...safe } = user;
    const resp = NextResponse.json({ user: safe });
    return setSessionCookie(resp, token);
  }

  if (method === 'POST' && route === '/auth/login') {
    const body = await request.json();
    const { email, password } = body;
    const user = await db.collection('users').findOne({ email: (email || '').toLowerCase(), password });
    if (!user) return err('invalid credentials', 401);
    const token = uuidv4();
    await db.collection('sessions').insertOne({ _id: token, user_id: user._id, created_at: new Date() });
    const { password: _, ...safe } = user;
    const resp = NextResponse.json({ user: safe });
    return setSessionCookie(resp, token);
  }

  if (method === 'POST' && route === '/auth/logout') {
    const jar = cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (token) await db.collection('sessions').deleteOne({ _id: token });
    const resp = NextResponse.json({ ok: true });
    resp.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return resp;
  }

  if (method === 'GET' && route === '/me') {
    const user = await getUserFromCookie();
    if (!user) return err('not authenticated', 401);
    return json({ user });
  }

  // ---- Public content ----
  if (method === 'GET' && route === '/blogs') {
    const posts = await db.collection('blogs').find({}).sort({ published_at: -1 }).toArray();
    return json({ posts });
  }
  if (method === 'GET' && route.startsWith('/blogs/')) {
    const slug = route.replace('/blogs/', '');
    const post = await db.collection('blogs').findOne({ slug });
    if (!post) return err('not found', 404);
    return json({ post });
  }
  if (method === 'GET' && route === '/courses') {
    const courses = await db.collection('courses').find({}).sort({ created_at: -1 }).toArray();
    return json({ courses });
  }
  if (method === 'GET' && route === '/insights') {
    const insights = await db.collection('insights').find({}).toArray();
    return json({ insights });
  }

  // ---- Course enrollment + completion ----
  if (method === 'GET' && route.startsWith('/courses/by-id/')) {
    const id = route.replace('/courses/by-id/', '');
    const course = await db.collection('courses').findOne({ _id: id });
    if (!course) return err('not found', 404);
    return json({ course });
  }
  if (method === 'POST' && route === '/courses/watch') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const { course_id, lecture_id } = await request.json();
    const course = await db.collection('courses').findOne({ _id: course_id });
    if (!course) return err('course not found', 404);
    const total = (course.lectures || []).length || 1;
    const enr = await db.collection('enrollments').findOne({ user_id: user._id, course_id });
    const watched = new Set(enr?.watched_lectures || []);
    watched.add(lecture_id);
    const watchedArr = Array.from(watched);
    const progress = Math.round((watchedArr.length / total) * 100);
    const isComplete = progress >= 100;
    const update = {
      $set: {
        watched_lectures: watchedArr,
        progress,
        last_watched_at: new Date(),
      },
      $setOnInsert: { _id: uuidv4(), user_id: user._id, course_id, enrolled_at: new Date() },
    };
    if (isComplete && !enr?.completed_at) {
      update.$set.completed_at = new Date();
      update.$set.certificate_id = uuidv4();
    }
    await db.collection('enrollments').updateOne({ user_id: user._id, course_id }, update, { upsert: true });
    const fresh = await db.collection('enrollments').findOne({ user_id: user._id, course_id });
    return json({ enrollment: fresh });
  }
  if (method === 'POST' && route === '/courses/enroll') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const { course_id } = await request.json();
    const existing = await db.collection('enrollments').findOne({ user_id: user._id, course_id });
    if (existing) return json({ enrollment: existing });
    const enrollment = {
      _id: uuidv4(),
      user_id: user._id,
      course_id,
      progress: 0,
      enrolled_at: new Date(),
      completed_at: null,
      certificate_id: null,
    };
    await db.collection('enrollments').insertOne(enrollment);
    return json({ enrollment });
  }
  if (method === 'POST' && route === '/courses/complete') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const { course_id } = await request.json();
    const cert = uuidv4();
    await db.collection('enrollments').updateOne(
      { user_id: user._id, course_id },
      { $set: { progress: 100, completed_at: new Date(), certificate_id: cert } },
      { upsert: true }
    );
    return json({ ok: true, certificate_id: cert });
  }
  if (method === 'GET' && route === '/courses/mine') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const mine = await db.collection('enrollments').find({ user_id: user._id }).toArray();
    return json({ enrollments: mine });
  }

  // ---- AI Diagnose ----
  if (method === 'POST' && route === '/diagnose') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const body = await request.json();
    const { text, image_base64, session_id } = body;
    if (!text && !image_base64) return err('text or image required');

    // Check balance (need at least 1 BWP reserved)
    const MIN_RESERVE = 1.0;
    if ((user.balance_bwp || 0) < MIN_RESERVE) {
      return err('insufficient balance', 402, { balance_bwp: user.balance_bwp, min_required: MIN_RESERVE });
    }

    const sid = session_id || uuidv4();
    const chat = await db.collection('chats').findOne({ _id: sid });
    const history = chat?.messages || [];

    const systemMessage = `You are mAgri AI, an expert agricultural advisor focused on smallholder farming in Botswana and Southern Africa. Provide clear, actionable advice for crop and livestock health, pest/disease diagnosis, soil management, and conservation agriculture. When a photo is provided, describe what you see first, then diagnose and recommend next steps. Use local context (Thuo Letlotlo, Temo Letlotlo, Tswana climate). Keep responses concise (under 350 words), use markdown with short bullet lists. Always include a \"Confidence\" section (Low/Medium/High) and a \"Next steps\" section.`;

    // Call Python helper
    let llmResult;
    const MAX_RETRIES = 2;
    let lastErr = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        llmResult = await callPythonLLM({
          api_key: process.env.EMERGENT_LLM_KEY,
          session_id: sid,
          system_message: systemMessage,
          history,
          text: text || 'Please analyze this image.',
          image_base64: image_base64 || null,
          provider: 'anthropic',
          model: 'claude-sonnet-4-5-20250929',
        });
        if (llmResult?.ok) break;
        lastErr = llmResult?.error || 'unknown';
      } catch (e) {
        lastErr = e.message;
      }
    }
    if (!llmResult || !llmResult.ok) {
      // Log failed attempt for reconciliation
      await db.collection('usage_logs').insertOne({
        _id: uuidv4(),
        user_id: user._id,
        session_id: sid,
        status: 'failed',
        error: lastErr,
        created_at: new Date(),
      });
      return err('AI call failed after retries', 502, { detail: lastErr });
    }

    const inputTokens = llmResult.input_tokens || 0;
    const outputTokens = llmResult.output_tokens || 0;
    const costBWP = computeCostBWP(inputTokens, outputTokens);

    // Debit wallet atomically (mongodb driver v6 returns doc directly or null)
    const updated = await db.collection('users').findOneAndUpdate(
      { _id: user._id, balance_bwp: { $gte: costBWP } },
      { $inc: { balance_bwp: -costBWP } },
      { returnDocument: 'after' }
    );
    const debitedDoc = updated?.value !== undefined ? updated.value : updated;
    const newBalance = debitedDoc ? debitedDoc.balance_bwp : (user.balance_bwp - costBWP);
    const debitStatus = debitedDoc ? 'debited' : 'underfunded';

    // Save chat history
    const userMessage = { role: 'user', content: text || '[image]', ts: new Date(), has_image: !!image_base64 };
    const assistantMessage = { role: 'assistant', content: llmResult.reply, ts: new Date() };
    await db.collection('chats').updateOne(
      { _id: sid },
      {
        $setOnInsert: { user_id: user._id, created_at: new Date() },
        $set: { updated_at: new Date() },
        $push: { messages: { $each: [userMessage, assistantMessage] } },
      },
      { upsert: true }
    );

    // Log usage
    const usageLog = {
      _id: uuidv4(),
      user_id: user._id,
      user_email: user.email,
      session_id: sid,
      model: llmResult.model,
      provider: llmResult.provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_bwp: costBWP,
      prompt_preview: (text || '').slice(0, 200),
      had_image: !!image_base64,
      status: debitStatus,
      created_at: new Date(),
    };
    await db.collection('usage_logs').insertOne(usageLog);

    // Also log a debit transaction
    await db.collection('transactions').insertOne({
      _id: uuidv4(),
      user_id: user._id,
      type: 'debit',
      amount_bwp: costBWP,
      status: 'success',
      reference: usageLog._id,
      description: `AI diagnose (${inputTokens}+${outputTokens} tok)`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return json({
      ok: true,
      session_id: sid,
      reply: llmResult.reply,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_bwp: costBWP,
      balance_bwp: newBalance,
      model: llmResult.model,
    });
  }

  // ---- Chat history ----
  if (method === 'GET' && route.startsWith('/chat/')) {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const sid = route.replace('/chat/', '');
    const chat = await db.collection('chats').findOne({ _id: sid, user_id: user._id });
    return json({ chat });
  }
  if (method === 'GET' && route === '/chats') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const chats = await db
      .collection('chats')
      .find({ user_id: user._id })
      .project({ messages: { $slice: -1 }, created_at: 1, updated_at: 1 })
      .sort({ updated_at: -1 })
      .toArray();
    return json({ chats });
  }

  // ---- Usage ----
  if (method === 'GET' && route === '/usage') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const logs = await db
      .collection('usage_logs')
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    const totals = await db
      .collection('usage_logs')
      .aggregate([
        { $match: { user_id: user._id, status: 'debited' } },
        {
          $group: {
            _id: null,
            total_input: { $sum: '$input_tokens' },
            total_output: { $sum: '$output_tokens' },
            total_cost: { $sum: '$cost_bwp' },
            calls: { $sum: 1 },
          },
        },
      ])
      .toArray();
    return json({ logs, totals: totals[0] || { total_input: 0, total_output: 0, total_cost: 0, calls: 0 } });
  }

  // ---- Billing: MOCKED Orange Money ----
  if (method === 'POST' && route === '/billing/topup') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const { amount_bwp, msisdn } = await request.json();
    const amt = parseFloat(amount_bwp);
    if (!amt || amt <= 0 || amt > 10000) return err('invalid amount (1-10000 BWP)');
    const txId = uuidv4();
    const orangeRef = 'OM-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const willFail = Math.random() < 0.1; // 10% simulated failure
    const processAfter = new Date(Date.now() + 3000 + Math.floor(Math.random() * 3000));
    const tx = {
      _id: txId,
      user_id: user._id,
      type: 'topup',
      amount_bwp: amt,
      status: 'pending',
      provider: 'orange_money_mock',
      orange_ref: orangeRef,
      msisdn: msisdn || '+267 7X XXX XXX',
      scheduled_outcome: willFail ? 'failed' : 'success',
      process_after: processAfter,
      retries: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.collection('transactions').insertOne(tx);
    return json({
      tx_id: txId,
      orange_ref: orangeRef,
      status: 'pending',
      checkout_url: `/wallet?tx=${txId}`,
      amount_bwp: amt,
      eta_seconds: 4,
    });
  }

  if (method === 'GET' && route.startsWith('/billing/tx/')) {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const txId = route.replace('/billing/tx/', '');
    const tx = await db.collection('transactions').findOne({ _id: txId, user_id: user._id });
    if (!tx) return err('tx not found', 404);

    // Auto-advance pending orange topups when time has passed
    if (tx.status === 'pending' && tx.type === 'topup' && tx.process_after && new Date() >= tx.process_after) {
      if (tx.scheduled_outcome === 'success') {
        await db.collection('users').updateOne({ _id: user._id }, { $inc: { balance_bwp: tx.amount_bwp } });
        await db.collection('transactions').updateOne({ _id: txId }, { $set: { status: 'success', updated_at: new Date() } });
        tx.status = 'success';
      } else {
        await db.collection('transactions').updateOne({ _id: txId }, { $set: { status: 'failed', failure_reason: 'Insufficient Orange Money balance (simulated)', updated_at: new Date() } });
        tx.status = 'failed';
        tx.failure_reason = 'Insufficient Orange Money balance (simulated)';
      }
    }
    const freshUser = await db.collection('users').findOne({ _id: user._id });
    return json({ tx, balance_bwp: freshUser?.balance_bwp });
  }

  if (method === 'POST' && route.startsWith('/billing/retry/')) {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const txId = route.replace('/billing/retry/', '');
    const tx = await db.collection('transactions').findOne({ _id: txId, user_id: user._id });
    if (!tx) return err('tx not found', 404);
    if (tx.status !== 'failed') return err('only failed tx can be retried');
    const willFail = Math.random() < 0.3;
    const processAfter = new Date(Date.now() + 2500);
    await db.collection('transactions').updateOne(
      { _id: txId },
      {
        $set: {
          status: 'pending',
          scheduled_outcome: willFail ? 'failed' : 'success',
          process_after: processAfter,
          updated_at: new Date(),
          failure_reason: null,
        },
        $inc: { retries: 1 },
      }
    );
    return json({ ok: true, tx_id: txId, status: 'pending' });
  }

  if (method === 'GET' && route === '/billing/transactions') {
    const user = await getUserFromCookie();
    if (!user) return err('auth required', 401);
    const txs = await db.collection('transactions').find({ user_id: user._id }).sort({ created_at: -1 }).limit(100).toArray();
    return json({ transactions: txs });
  }

  // ---- Admin Analytics ----
  if (method === 'GET' && route === '/admin/analytics') {
    const user = await getUserFromCookie();
    if (!user || !user.is_admin) return err('admin only', 403);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const signupsDaily = await db.collection('users').aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    const aiDaily = await db.collection('usage_logs').aggregate([
      { $match: { created_at: { $gte: since }, status: 'debited' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          calls: { $sum: 1 },
          input_tokens: { $sum: '$input_tokens' },
          output_tokens: { $sum: '$output_tokens' },
          cost_bwp: { $sum: '$cost_bwp' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const revenueDaily = await db.collection('transactions').aggregate([
      { $match: { created_at: { $gte: since }, type: 'topup', status: 'success' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } }, revenue: { $sum: '$amount_bwp' } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    const [totalUsers, totalCalls, totalRevenueAgg, totalCertAgg, topUsers, recentLogs] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('usage_logs').countDocuments({ status: 'debited' }),
      db.collection('transactions').aggregate([
        { $match: { type: 'topup', status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount_bwp' } } },
      ]).toArray(),
      db.collection('enrollments').countDocuments({ completed_at: { $ne: null } }),
      db.collection('usage_logs').aggregate([
        { $match: { status: 'debited' } },
        { $group: { _id: '$user_id', email: { $first: '$user_email' }, calls: { $sum: 1 }, cost: { $sum: '$cost_bwp' } } },
        { $sort: { cost: -1 } },
        { $limit: 10 },
      ]).toArray(),
      db.collection('usage_logs').find({}).sort({ created_at: -1 }).limit(25).toArray(),
    ]);

    const totalEnrollments = await db.collection('enrollments').countDocuments();
    const failedTx = await db.collection('transactions').countDocuments({ type: 'topup', status: 'failed' });
    const pendingTx = await db.collection('transactions').countDocuments({ type: 'topup', status: 'pending' });

    return json({
      summary: {
        total_users: totalUsers,
        total_ai_calls: totalCalls,
        total_revenue_bwp: totalRevenueAgg[0]?.total || 0,
        total_completions: totalCertAgg,
        total_enrollments: totalEnrollments,
        completion_rate: totalEnrollments ? (totalCertAgg / totalEnrollments) : 0,
        failed_topups: failedTx,
        pending_topups: pendingTx,
      },
      signups_daily: signupsDaily,
      ai_daily: aiDaily,
      revenue_daily: revenueDaily,
      top_users: topUsers,
      recent_logs: recentLogs,
    });
  }

  // ---- Admin reconciliation ----
  if (method === 'POST' && route === '/admin/reconcile') {
    const user = await getUserFromCookie();
    if (!user || !user.is_admin) return err('admin only', 403);
    // Find stuck pending topups > 10 minutes, mark failed
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const res = await db.collection('transactions').updateMany(
      { type: 'topup', status: 'pending', created_at: { $lt: cutoff } },
      { $set: { status: 'failed', failure_reason: 'Timeout during reconciliation', updated_at: new Date() } }
    );
    return json({ ok: true, reconciled: res.modifiedCount });
  }

  return err('not found: ' + method + ' ' + route, 404);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const PATCH = handle;
