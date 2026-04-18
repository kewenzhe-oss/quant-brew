import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '@/app/layouts/PageLayout';
import { useAssetPrice, useStockName } from '@/shared/hooks/useAssetInfo';
import { useAnalysis } from '@/shared/hooks/useAnalysis';
import { useRecentSymbols } from '@/shared/hooks/useRecentSymbols';
import { AssetHeader } from './AssetHeader';
import { AssetEntry } from './AssetEntry';
import { AnalysisView } from './analysis/AnalysisView';
import { ResearchContextPanel } from './ResearchContextPanel';
import styles from './ResearchPage.module.css';

export function ResearchPage() {
  const { market, symbol } = useParams<{ market: string; symbol: string }>();

  if (!market || !symbol) {
    return (
      <PageLayout
        main={<AssetEntry />}
      />
    );
  }

  return <ResearchAssetView market={market} symbol={symbol} />;
}

function ResearchAssetView({ market, symbol }: { market: string; symbol: string }) {
  const { data: priceData } = useAssetPrice(market, symbol);
  const { data: nameData } = useStockName(market, symbol);
  const { data: analysis } = useAnalysis(market, symbol);
  const { addRecent } = useRecentSymbols();

  useEffect(() => {
    if (nameData?.name) {
      addRecent(market, symbol, nameData.name);
    }
  }, [market, symbol, nameData?.name, addRecent]);

  return (
    <PageLayout
      main={
        <div className={styles.main}>
          <AssetHeader
            symbol={symbol}
            market={market}
            name={nameData?.name ?? null}
            price={priceData?.price ?? null}
            change={priceData?.change ?? null}
            changePercent={priceData?.changePercent ?? null}
            sector={nameData?.sector}
            exchange={nameData?.exchange}
          />
          <AnalysisView market={market} symbol={symbol} />
        </div>
      }
      context={
        <ResearchContextPanel
          market={market}
          symbol={symbol}
          analysis={analysis}
        />
      }
    />
  );
}
