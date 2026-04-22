import { useParams, Navigate } from 'react-router-dom';
import { PageLayout } from '@/app/layouts/PageLayout';
import { DIMENSION_CONFIGS } from './chapterConfig';

import { DimensionHeroDecision } from './components/DimensionHeroDecision';
import { DimensionHeroReadouts } from './components/DimensionHeroReadouts';
import { DimensionAIOverview } from './components/DimensionAIOverview';
import { ChapterSection } from './components/ChapterSection';
import { ChapterIntro } from './components/ChapterIntro';
import { ChapterVerdict } from './components/ChapterVerdict';
import { ChapterThesis } from './components/ChapterThesis';
import { KeyMetricsSnapshot } from './components/KeyMetricsSnapshot';
import { ChartEvidence } from './components/ChartEvidence';
import { MetricExplainers } from './components/MetricExplainers';
import { EvidenceTable } from './components/EvidenceTable';
import { RiskWatch } from './components/RiskWatch';

import styles from './DimensionResearchPage.module.css';

export function DimensionResearchPage() {
    const { factorKey } = useParams<{ factorKey: string }>();

    if (!factorKey || !DIMENSION_CONFIGS[factorKey]) {
        return <Navigate to="/macro" replace />;
    }

    const config = DIMENSION_CONFIGS[factorKey];

    const main = (
        <div className={styles.pageContainer}>
            {/* HERO DECISION ZONE */}
            <section className={styles.heroZone}>
                <DimensionHeroDecision verdict={config.heroVerdict} coreQuestion={config.coreQuestion} />
                <DimensionHeroReadouts factor={config.factor} metrics={config.heroMetrics} />
                <DimensionAIOverview summary={config.aiSummary} />
            </section>

            {/* RESEARCH CHAPTERS */}
            <div className={styles.chaptersContainer}>
                {config.chapters.map(chapter => (
                    <ChapterSection key={chapter.id}>
                        <ChapterIntro title={chapter.title} intro={chapter.intro} />
                        <ChapterVerdict verdict={chapter.verdict} />
                        <ChapterThesis thesis={chapter.thesis} />
                        
                        <KeyMetricsSnapshot factor={config.factor} metrics={chapter.keyMetrics} />
                        
                        <div className={styles.evidenceRow}>
                            <ChartEvidence factor={config.factor} metrics={chapter.chartEvidence} />
                            <MetricExplainers factor={config.factor} explainers={chapter.explainers} />
                        </div>

                        {chapter.evidenceTable && chapter.evidenceTable.length > 0 && (
                            <EvidenceTable factor={config.factor} metrics={chapter.evidenceTable!} />
                        )}

                        {chapter.riskWatch && chapter.riskWatch.length > 0 && (
                            <RiskWatch risks={chapter.riskWatch!} />
                        )}
                    </ChapterSection>
                ))}
            </div>
        </div>
    );

    return <PageLayout main={main} />;
}
