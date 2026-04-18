import { Link } from 'react-router-dom';
import { DataCard } from '@/shared/components/DataCard';
import type { BriefingSection } from '@/shared/api/types';
import styles from './MentionedSymbols.module.css';

interface MentionedSymbolsProps {
  sections: BriefingSection[];
}

export function MentionedSymbols({ sections }: MentionedSymbolsProps) {
  const seen = new Set<string>();
  const symbols: { market: string; symbol: string; name: string }[] = [];

  for (const section of sections) {
    for (const s of section.mentioned_symbols ?? []) {
      const key = `${s.market}:${s.symbol}`;
      if (!seen.has(key)) {
        seen.add(key);
        symbols.push(s);
      }
    }
  }

  if (symbols.length === 0) return null;

  return (
    <DataCard title="今日提及标的">
      <div className={styles.chipList}>
        {symbols.map((s) => (
          <Link
            key={`${s.market}-${s.symbol}`}
            to={`/research/${s.market}/${s.symbol}`}
            className={styles.chip}
          >
            <span className={styles.chipSymbol}>{s.symbol}</span>
            <span className={styles.chipName}>{s.name}</span>
          </Link>
        ))}
      </div>
    </DataCard>
  );
}
