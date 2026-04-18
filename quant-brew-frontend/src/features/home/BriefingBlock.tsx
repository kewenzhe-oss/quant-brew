import { TickerChip } from '@/shared/components/TickerChip';
import type { BriefingSection } from '@/shared/api/types';
import styles from './BriefingBlock.module.css';

interface BriefingBlockProps {
  section: BriefingSection;
}

export function BriefingBlock({ section }: BriefingBlockProps) {
  return (
    <article className={styles.block}>
      <h2 className={styles.headline}>{section.headline}</h2>
      <div className={styles.body}>
        <RichText
          text={section.body}
          symbols={section.mentioned_symbols}
        />
      </div>
      {section.mentioned_symbols && section.mentioned_symbols.length > 0 && (
        <div className={styles.mentions}>
          {section.mentioned_symbols.map((s) => (
            <TickerChip
              key={s.symbol}
              symbol={s.symbol}
              name={s.name}
              market={s.market}
            />
          ))}
        </div>
      )}
    </article>
  );
}

interface RichTextProps {
  text: string;
  symbols?: { market: string; symbol: string; name: string }[];
}

function RichText({ text, symbols }: RichTextProps) {
  if (!symbols || symbols.length === 0) {
    return <p>{text}</p>;
  }

  let remaining = text;
  const parts: React.ReactNode[] = [];
  let key = 0;

  for (const sym of symbols) {
    const nameWithParen = `${sym.name}（${sym.symbol}）`;
    const idx = remaining.indexOf(nameWithParen);
    if (idx >= 0) {
      if (idx > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      }
      parts.push(
        <TickerChip key={key++} symbol={sym.symbol} name={nameWithParen} market={sym.market} />,
      );
      remaining = remaining.slice(idx + nameWithParen.length);
    }
  }

  if (remaining) {
    parts.push(<span key={key++}>{remaining}</span>);
  }

  return <p>{parts}</p>;
}
