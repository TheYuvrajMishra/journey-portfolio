/**
 * content.ts — THE single source of truth for every word and link on this site.
 *
 * How to edit chapter copy:
 *  1. Open this file.
 *  2. Find the chapter in the `chapters` array below and edit `title`,
 *     `kicker`, `oneLiner` or `body`.
 *  3. Save. The 3D world, the HTML overlay, and the screen-reader fallback
 *     all read from here — nothing else needs to change.
 *
 * To change the contact links (chapter 6), edit `links` below.
 * To change the tech stack icons (chapter 5), edit `stack` below.
 * To change the sound toggle label or loader text, edit `ui` below.
 */

export interface ChapterCopy {
  /** short label, e.g. "01 · Origin" */
  kicker: string;
  /** big display title */
  title: string;
  /** one playful line shown under the title */
  oneLiner: string;
  /** 2 short paragraphs for the screen-reader / SEO fallback */
  body: string[];
}

export interface ContactLink {
  label: string;
  url: string;
  hint: string;
}

export interface StackItem {
  name: string;
  blurb: string;
  /** short glyph drawn on the canvas sprite */
  glyph: string;
  color: string;
}

export const site = {
  name: "Yuvraj Mishra",
  role: "Full Stack AI Engineer",
  tagline: "scroll to walk my journey",
  url: "https://yuvrajmishra.online",
};

export const chapters: ChapterCopy[] = [
  {
    kicker: "01 · Origin",
    title: "Kolkata, at dawn",
    oneLiner: "a bedroom, a second-hand laptop, and an unreasonable amount of chai.",
    body: [
      "I taught myself to code in Kolkata — no CS degree yet, just docs, videos, and stubbornness. My desk was a battlefield of brackets and breakpoints.",
      "Every yellow taxi outside my window was a reminder: the city moves fast. I wanted to move faster.",
    ],
  },
  {
    kicker: "02 · First ships",
    title: "Eighteen, and shipping",
    oneLiner: "my first live sites. real users. terrifying. addictive.",
    body: [
      "At 18 I joined NXT World Wide in Kolkata as a full stack developer — my first time shipping to production and watching strangers actually use what I built.",
      "I planted my flag on the live web and never looked back. Ship early, fix fast, learn faster.",
    ],
  },
  {
    kicker: "03 · Remote leap",
    title: "Timezone? irrelevant.",
    oneLiner: "went remote with ZyrixCraft, Delhi — my desk stayed in Kolkata, my code went everywhere.",
    body: [
      "I took a remote full stack role with ZyrixCraft in Delhi and learned the real remote skills: async communication, owning features end-to-end, and demoing over dodgy Wi-Fi.",
      "Different clocks on the wall, same shipping cadence. Distance turned out to be a rounding error.",
    ],
  },
  {
    kicker: "04 · Foontro",
    title: "CTO at Foontro",
    oneLiner: "from shipping features to shipping the whole company.",
    body: [
      "Since January 2026 I've been CTO at Foontro, Mumbai — a curated freelance marketplace. I own the tech: architecture, product calls, and the 2 AM deploys nobody claps for.",
      "Leading a team taught me the hardest stack of all: people, priorities, and saying no to good ideas so great ones survive.",
    ],
  },
  {
    kicker: "05 · Stack",
    title: "Weapons of choice",
    oneLiner: "the tools I reach for when something needs to exist by Friday.",
    body: [
      "My daily drivers: Node.js and Express on the backend, React and Next.js up front, TypeScript everywhere, Tailwind for speed, MongoDB and SQL for data, WebSockets when it needs to feel alive.",
      "Lately: agentic AI workflows — intent classification, prompt engineering, and wiring LLMs into products that actually ship.",
    ],
  },
  {
    kicker: "06 · Now",
    title: "The campfire",
    oneLiner: "currently: building, studying BCA at IGNOU, open to what's next.",
    body: [
      "Right now I'm CTO at Foontro, studying BCA at IGNOU, and building in public from Kolkata. The journey so far fits in six chapters — the next one isn't written yet.",
      "Want to build something together, or just talk shop? The lanterns below actually work. Pick one.",
    ],
  },
];

export const stack: StackItem[] = [
  { name: "Next.js", blurb: "App Router, RSC, my default for shipping web apps.", glyph: "N", color: "#111111" },
  { name: "Node.js", blurb: "APIs, workers, WebSockets — the runtime I think in.", glyph: "⬢", color: "#3c873a" },
  { name: "Express", blurb: "Lean REST APIs. No ceremony, just routes.", glyph: "E", color: "#444444" },
  { name: "MongoDB", blurb: "My primary DB — flexible schemas, fast iteration.", glyph: "M", color: "#13aa52" },
  { name: "Tailwind CSS", blurb: "Utility-first styling at unreasonable speed.", glyph: "~", color: "#38bdf8" },
  { name: "Three.js", blurb: "This page. Enough said.", glyph: "▲", color: "#7dd3fc" },
];

export const links: ContactLink[] = [
  { label: "GitHub", url: "https://github.com/TheYuvrajMishra", hint: "code I've shipped" },
  { label: "LinkedIn", url: "https://www.linkedin.com/in/the-yuvraj-mishra", hint: "the professional me" },
  { label: "Email", url: "mailto:yuvraj17mishra11@gmail.com", hint: "yuvraj17mishra11@gmail.com" },
  { label: "Website", url: "https://yuvrajmishra.online", hint: "my corner of the internet" },
];

export const ui = {
  scrollHint: "scroll to begin",
  soundLabel: "ambient sound",
  loaderTitle: "warming up the world",
  loaderSteps: ["toon shaders", "winding path", "planting chapters", "first light"],
  progressLabel: "journey progress",
};
