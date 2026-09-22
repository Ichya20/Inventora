import React from 'react';

/**
 * Strips raw markdown clutter such as asterisks (*, **), hash marks (#, ##, ###),
 * backticks (`), and bracket markers from AI-generated text.
 */
export function stripAiClutter(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown headers: # Header -> Header
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic asterisks: **text** -> text, *text* -> text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    // Remove underscores for emphasis: __text__ -> text, _text_ -> text
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    // Remove inline backticks: `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code block backticks: ```ts ... ```
    .replace(/```[a-z]*\n?/gi, '')
    // Normalize asterisk or plus bullets to clean standard bullets
    .replace(/^\s*[\*\+]\s+/gm, '• ')
    // Normalize dash bullets to clean standard bullets
    .replace(/^\s*-\s+/gm, '• ')
    // Remove distracting brackets around titles: **[Executive Summary]** -> Executive Summary
    .replace(/\[([^\]]+)\]/g, '$1')
    // Trim extra spaces on each line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

interface CleanAiTextProps {
  text: string;
  className?: string;
}

/**
 * CleanAiText formats AI responses into neat, high-contrast, professional typography.
 * It removes distracting raw symbols (asterisks, hash symbols, backticks) and structures
 * headings, bullet points, and key metrics into clean, uncluttered visual elements.
 */
export function CleanAiText({ text, className = '' }: CleanAiTextProps) {
  if (!text) return null;

  // Split into raw lines for structural classification
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let bulletGroup: string[] = [];

  const flushBullets = (keyIdx: number) => {
    if (bulletGroup.length === 0) return;
    elements.push(
      <ul key={`ul-${keyIdx}`} className="space-y-1.5 my-2.5 pl-1">
        {bulletGroup.map((item, bIdx) => {
          // Check if bullet has a label (e.g. "Metric Name: value")
          const colonIdx = item.indexOf(':');
          if (colonIdx > 0 && colonIdx < 40) {
            const label = item.slice(0, colonIdx).trim();
            const value = item.slice(colonIdx + 1).trim();
            return (
              <li key={bIdx} className="flex items-start gap-2 text-xs leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] dark:bg-[#3291ff] mt-1.5 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{label}:</span>{' '}
                  {value}
                </span>
              </li>
            );
          }
          return (
            <li key={bIdx} className="flex items-start gap-2 text-xs leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] dark:bg-[#3291ff] mt-1.5 shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
            </li>
          );
        })}
      </ul>
    );
    bulletGroup = [];
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushBullets(idx);
      return;
    }

    // Check if line is a bullet item (*, -, •, +)
    const bulletMatch = trimmed.match(/^[\*\-•\+]\s+(.*)$/);
    if (bulletMatch) {
      // Clean inline asterisks and backticks inside bullet
      const cleanedBullet = stripAiClutter(bulletMatch[1]);
      bulletGroup.push(cleanedBullet);
      return;
    }

    // If we were collecting bullets and hit a non-bullet line, flush them
    flushBullets(idx);

    // Check if line is a header (#, ##, ###, #### or [Title])
    const headerMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    const bracketHeaderMatch = trimmed.match(/^\[(.*)\]$/);
    const isHeader = headerMatch || bracketHeaderMatch || (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.includes('. '));

    if (isHeader) {
      const headerText = stripAiClutter(headerMatch ? headerMatch[1] : bracketHeaderMatch ? bracketHeaderMatch[1] : trimmed);
      elements.push(
        <h4
          key={`h-${idx}`}
          className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 mt-3 mb-1 tracking-tight flex items-center gap-1.5 first:mt-0"
        >
          <span className="w-1 h-3.5 bg-[#0070f3] dark:bg-[#3291ff] rounded-full inline-block shrink-0" />
          <span>{headerText}</span>
        </h4>
      );
      return;
    }

    // Standard paragraph line - clean any markdown clutter
    const cleanedParagraph = stripAiClutter(trimmed);
    elements.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 my-1.5 first:mt-0 last:mb-0">
        {cleanedParagraph}
      </p>
    );
  });

  flushBullets(lines.length);

  return (
    <div className={`space-y-0.5 ${className}`}>
      {elements}
    </div>
  );
}
export default CleanAiText;
