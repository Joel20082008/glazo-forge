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
Produce 2 complete scripts. Each script is one result block and contains labelled lines: HOOK, BODY (3-6 beats with timestamps), CTA. Keep it to roughly 45 seconds spoken.`,
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
Produce exactly 3 result blocks in this order: a SHORT caption (under 120 characters), a LONG caption (3 short paragraphs), and a CTA SUGGESTIONS block with 5 calls to action. Start each block with its label on the first line.`,
  },
  hashtag: {
    id: "hashtag",
    name: "Hashtag Generator",
    tagline: "Niche and broad sets",
    icon: "#",
    inputLabel: "Describe the content",
    placeholder: "e.g. A 30-second recipe for high-protein overnight oats",
    platform: true,
    longInput: true,
    system: `${SHARED}
Produce exactly 2 result blocks. Block 1 starts with the line NICHE HASHTAGS followed by 12 specific low-competition hashtags. Block 2 starts with BROAD HASHTAGS followed by 10 high-reach hashtags. Space-separate the tags.`,
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
