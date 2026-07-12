// Best-effort client-side categorization by app name — no backend concept of
// "category" exists, this is purely a display heuristic.
const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  [
    'Development',
    ['code', 'visual studio', 'xcode', 'intellij', 'webstorm', 'pycharm', 'android studio',
      'terminal', 'iterm', 'sublime', 'vim', 'docker', 'postman', 'github desktop'],
  ],
  ['Browsing', ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'arc']],
  ['Communication', ['slack', 'teams', 'discord', 'zoom', 'skype', 'messages', 'mail', 'outlook']],
  ['Productivity', ['word', 'excel', 'powerpoint', 'docs', 'sheets', 'notion', 'obsidian', 'notes', 'calendar']],
  ['Design', ['figma', 'photoshop', 'illustrator', 'sketch', 'xd', 'affinity']],
  ['Entertainment', ['spotify', 'music', 'netflix', 'youtube', 'vlc']],
];

export function categorizeApp(appName: string): string {
  const lower = appName.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}
