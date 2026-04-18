import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSymbolSearch } from '@/shared/hooks/useSymbolSearch';
import { useRecentSymbols } from '@/shared/hooks/useRecentSymbols';
import { sectorGroups } from '@/shared/mocks/sectorGroups';
import { MicroLabel } from '@/shared/components/MicroLabel';
import type { SymbolSearchResult } from '@/shared/api/types';
import styles from './AssetEntry.module.css';

export function AssetEntry() {
  const [keyword, setKeyword] = useState('');
  const [market, setMarket] = useState('');
  const { results, isLoading } = useSymbolSearch(keyword, { market });
  const { items: recentItems } = useRecentSymbols();

  const showResults = keyword.trim().length > 0;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>个股研究</h1>
      <p className={styles.subtitle}>按标的搜索，或从赛道浏览龙头股</p>

      <div className={styles.searchArea}>
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="搜索标的 — 输入代码或名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            autoFocus
          />
          <select
            className={styles.marketSelect}
            value={market}
            onChange={(e) => setMarket(e.target.value)}
          >
            <option value="">全部市场</option>
            <option value="USStock">美股</option>
            <option value="Crypto">加密</option>
          </select>
        </div>

        {showResults && (
          <div className={styles.resultsList}>
            {isLoading && (
              <div className={styles.resultsHint}>搜索中…</div>
            )}
            {!isLoading && results.length === 0 && (
              <div className={styles.resultsHint}>未找到匹配标的</div>
            )}
            {results.map((r) => (
              <ResultRow key={`${r.market}-${r.symbol}`} item={r} />
            ))}
          </div>
        )}
      </div>

      {recentItems.length > 0 && !showResults && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>最近研究</h2>
          <div className={styles.chipRow}>
            {recentItems.slice(0, 8).map((r) => (
              <Link
                key={`${r.market}-${r.symbol}`}
                to={`/research/${r.market}/${r.symbol}`}
                className={styles.chip}
              >
                <span className={styles.chipSymbol}>{r.symbol}</span>
                {r.name && <span className={styles.chipName}>{r.name}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!showResults && (
        <div className={styles.sectors}>
          {sectorGroups.map((group) => (
            <section key={group.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>{group.name}</h2>
              <p className={styles.sectionDesc}>{group.description}</p>
              <div className={styles.tickerGrid}>
                {group.tickers.map((t) => (
                  <Link
                    key={`${t.market}-${t.symbol}`}
                    to={`/research/${t.market}/${t.symbol}`}
                    className={styles.tickerCard}
                  >
                    <span className={styles.tickerSymbol}>{t.symbol}</span>
                    <span className={styles.tickerName}>{t.name}</span>
                    <MicroLabel color="gold">
                      {t.market === 'Crypto' ? '加密' : '美股'}
                    </MicroLabel>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultRow({ item }: { item: SymbolSearchResult }) {
  return (
    <Link
      to={`/research/${item.market}/${item.symbol}`}
      className={styles.resultRow}
    >
      <span className={styles.resultSymbol}>{item.symbol}</span>
      <span className={styles.resultName}>{item.name}</span>
      <MicroLabel color="gold">
        {item.market === 'Crypto' ? '加密' : '美股'}
      </MicroLabel>
    </Link>
  );
}
