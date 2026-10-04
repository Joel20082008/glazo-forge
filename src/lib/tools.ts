export type ToolId =
  | "hook"
  | "script"
  | "caption"
  | "hashtag"
  | "ideas"
  | "repurpose"
  | "improve";

export interface ToolDef {
  id: ToolId;
  name: string;
  tagline: string;
  icon: string;
  inputLabel: string;
  placeholder: string;
  /** Whether a platform selector is relevant. */
  platform: boolean;
  longInput: boolean;
  system: string;
}

export const TONES = [
  "Professional",
  "Hype & Energetic",
  "Educational & Approachable",
  "Witty & Relatable",
  "Storytelling",
  "Minimalist",
  "Bold & Confident",
  "Friendly & Casual",
  "Inspirational",
  "Humorous",
  "Luxury & Elegant",
  "Urgent & Punchy",
  "Warm & Empathetic",
  "Edgy & Provocative",
] as const;

export const PLATFORMS = [
  "TikTok",
  "Instagram Reels",
  "YouTube Shorts",
  "X",
  "LinkedIn",
  "Facebook",
] as const;

export const DURATIONS = ["30 seconds", "45 seconds", "60 seconds"] as const;

export const HOOK_STYLES = [
  "Curiosity",
  "Emotional",
  "Bold",
  "Question",
  "Storytelling",
  "Hype / Energetic",
  "Contrarian",
] as const;

export const CTA_GOALS = [
  "Follow",
  "Comment",
  "Save",
  "Share",
  "Visit profile",
  "Buy",
  "Learn more",
] as const;

export const CAPTION_TONE_SHIFTS = [
  { label: "🔥 More Hype", tone: "hype and energetic" },
  { label: "❤️ More Emotional", tone: "emotional and heartfelt" },
  { label: "😂 More Casual", tone: "casual, light and funny" },
  { label: "💼 More Professional", tone: "professional and polished" },
  { label: "✨ More Inspirational", tone: "inspirational" },
  { label: "🧠 More Educational", tone: "educational and informative" },
  { label: "😎 More Bold", tone: "bold and confident" },
] as const;

export const SCRIPT_STYLES = [
  "Storytelling",
  "Educational",
  "Promotional",
  "Tutorial / How-To",
  "Listicle",
  "Behind the Scenes",
  "Day in the Life",
  "Hot Take / Opinion",
  "Challenge / Trend",
  "Q&A / Myth Busting",
  "Before & After",
  "Vlog Style",
] as const;

const SHARED = `You are a senior short-form social content strategist. Write in plain text only — no markdown headings, no asterisks.
Separate each distinct result with a line containing only ---
Never explain yourself, never add preamble.`;

export const TOOLS: Record<ToolId, ToolDef> = {
  hook: {
    id: "hook",
    name: "Viral Hook Generator",
    tagline: "Scroll-stopping openers",
    icon: "⚡",
    inputLabel: "What is the video or post about?",
    placeholder: "e.g. 5 morning habits that actually compound",
    platform: true,
    longInput: false,
    system: `${SHARED}
Produce 6 hooks of under 15 words each. Each hook is one result block. Vary the angle: curiosity, contrarian, result-driven, question, story-open, direct callout.`,
  },
  script: {
    id: "script",
    name: "Script Generator",
    tagline: "Full short-form scripts",
    icon: "🎬",
    inputLabel: "Topic or brief",
    placeholder: "e.g. Why most creators quit in month three",
    platform: true,
    longInput: false,
    system: `${SHARED}
Produce 3 complete scripts. Each script is one result block. The three must be meaningfully different in angle, structure and opening — not reworded copies. Start each block with a line like: VERSION 1 — Emotional Story (pick fitting angle names, e.g. Emotional, Motivational, Bold, Educational, Contrarian).
Each block then contains labelled lines: HOOK, BODY (3-6 beats, each starting with a realistic timestamp like [0:04–0:12]), CTA. Timestamps must add up to the requested duration (default 45 seconds); write naturally for that length instead of truncating.
The HOOK must clearly reflect the requested hook style. The CTA must serve the requested CTA goal and feel native to the script and platform.
Adapt to platform: TikTok = fast opening, conversational, strong retention. Instagram Reels = visual, storytelling, polished but natural. Facebook = relatable, conversational, broad audience. YouTube Shorts = clear hook, structured story, strong payoff. X = concise, punchy, text-focused. LinkedIn = professional, insight-led.
Sound natural and human, avoid repetitive wording and generic motivational clichés, match tone and audience. Never guarantee virality or claim anything is trending.
End every block with these exact lines:
INTELLIGENCE
Hook Strength: Strong | Medium | Needs Improvement
Story Arc: Complete | Partial
Emotional Trigger: <main emotional angle, a few words>
CTA: Strong | Moderate | Weak
Estimated Duration: <N> seconds
Best For: <one or two platforms>
Be honest in this assessment; use phrases like attention-grabbing or high-retention structure, never "viral".`,
  },
  caption: {
    id: "caption",
    name: "Caption Generator",
    tagline: "Short, long and CTA copy",
    icon: "✍️",
    inputLabel: "What are you posting?",
    placeholder: "e.g. Behind the scenes of our product launch",
    platform: true,
    longInput: false,
    system: `${SHARED}
Produce result blocks in this order, each starting with its label alone on the first line: SHORT (concise, quick to read), LONG (developed caption with story, emotion and context), MICRO (one strong sentence), STORY (personal, conversational version), then CTA SUGGESTIONS.
Adapt to platform: Instagram Reels = conversational, visual-friendly, concise. TikTok = fast, casual, attention-focused. Facebook = relatable, conversational. YouTube Shorts = works as a video description. X = short, punchy, discussion-friendly. LinkedIn = professional, insight-led.
Sound natural and human, avoid repetitive AI-style wording, avoid unnecessary emojis and generic clichés, match tone, topic and audience. Never guarantee engagement or virality. Do not include hashtags.
End each of SHORT, LONG, MICRO and STORY with these exact lines:
INTELLIGENCE
Hook: Strong | Medium | Needs Improvement
Readability: Easy | Moderate | Difficult
Emotional Angle: <main emotion, a few words>
CTA Strength: Strong | Medium | Weak
Platform Fit: <one short sentence on why it fits the platform>
Reading Time: <N> seconds
These are structural assessments, not engagement predictions.
The CTA SUGGESTIONS block groups 2-3 CTAs per category using only categories that suit the content and platform, chosen from these headers: 💬 COMMENT, 📌 SAVE, 📤 SHARE, 👥 FOLLOW, 🔗 CLICK / VISIT, 🛒 BUY / CONVERT. Put each header on its own line followed by its CTAs.`,
  },
  hashtag: {
    id: "hashtag",
    name: "Hashtag Strategy Generator",
    tagline: "Grouped hashtags plus a strategy to use them",
    icon: "#",
    inputLabel: "Topic, caption or content idea",
    placeholder: "e.g. A 30-second recipe for high-protein overnight oats",
    platform: true,
    longInput: true,
    system: `${SHARED}
You are building a hashtag STRATEGY, not just a list. First silently analyze the topic, audience, platform, niche, tone and location (if given).
Produce these result blocks in this order, each starting with its label on the first line:
🎯 NICHE HASHTAGS — highly specific to the exact topic and audience. Only realistic hashtags people actually use or search; avoid made-up phrases.
🌎 BROAD HASHTAGS — larger general hashtags clearly related to the topic. Avoid extremely generic tags with little connection.
🔍 DISCOVERY HASHTAGS — relevant discovery/trend-style hashtags. You have NO live trend data, so never call any hashtag "trending"; use the label Discovery.
📍 LOCATION HASHTAGS — only include this block if the content or input clearly targets a country, city or region. Otherwise omit the block entirely.
👥 AUDIENCE HASHTAGS — hashtags describing the intended audience (e.g. #ContentCreators, #SmallBusinessOwners).
💡 HASHTAG STRATEGY — short simple-language lines: why the niche tags were chosen, why the broad tags, which target specific audiences, which aim for wider discovery, and how to combine the groups.
✅ RECOMMENDED MIX — a ready-to-paste final set (3–5 niche, 2–3 broad, 1–2 audience, 1–2 location/discovery when relevant) on one line, then this sentence: "Use a mixture instead of using only broad hashtags. Niche hashtags help describe exactly what your content is about, while broader hashtags can help expose it to a wider audience."
🧪 HASHTAG QUALITY CHECK — four lines: Relevance: High/Medium/Low, Specificity: High/Medium/Low, Audience Match: High/Medium/Low, Spam Risk: Low/Medium/High.
Space-separate tags inside each group. Relevance always beats quantity: never pad to hit a number. Never promise virality.`,
  },
  ideas: {
    id: "ideas",
    name: "Content Ideas",
    tagline: "Ideas for your niche",
    icon: "💡",
    inputLabel: "Your niche and audience",
    placeholder: "e.g. Fitness coaching for busy dads over 35",
    platform: true,
    longInput: false,
    system: `${SHARED}
Produce 8 content ideas. Each idea is one result block: a title line, then one line describing the angle, then one line with the format (e.g. talking head, b-roll voiceover, screen record).`,
  },
  repurpose: {
    id: "repurpose",
    name: "Content Repurposer",
    tagline: "One post, every platform",
    icon: "♻️",
    inputLabel: "Paste your existing content",
    placeholder: "Paste a blog post, newsletter, transcript or caption…",
    platform: false,
    longInput: true,
    system: `${SHARED}
Produce exactly 5 result blocks, each starting with its platform label on the first line: TIKTOK SCRIPT, INSTAGRAM CAPTION, X POST, LINKEDIN POST, YOUTUBE SHORTS SCRIPT. Respect each platform's native length and style.`,
  },
  improve: {
    id: "improve",
    name: "Content Improver",
    tagline: "Sharper hook, clearer CTA",
    icon: "🪄",
    inputLabel: "Paste the content to improve",
    placeholder: "Paste a caption, script or post…",
    platform: true,
    longInput: true,
    system: `${SHARED}
Produce exactly 2 result blocks. Block 1 starts with IMPROVED VERSION and contains the rewritten content with a stronger hook, tighter structure and a clear CTA. Block 2 starts with WHAT CHANGED and lists 4 bullet-free short lines covering hook, structure, clarity, CTA and engagement potential.`,
  },
};

export const TOOL_LIST = Object.values(TOOLS);

export const PLAN_LIMITS: Record<string, { generations: number; projects: number; label: string }> =
  {
    free: { generations: 25, projects: 10, label: "Free" },
    pro: { generations: 500, projects: 200, label: "Pro" },
    premium: { generations: 5000, projects: 2000, label: "Premium" },
  };
