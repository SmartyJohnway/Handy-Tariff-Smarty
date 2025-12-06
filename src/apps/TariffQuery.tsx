import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from '../context/SearchContext';
import { useNotifier } from '../context/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, FileQuestion } from 'lucide-react';
import {
  useTariffRulesQuery,
  getCachedTariffRules,
  type TariffItem,
  type TariffTariffs,
} from '@/hooks/queries/useTariffRulesQuery';

// Card for a single tariff rule
const ResultCard = ({ item }: { item: TariffItem }) => {
  const { searchHtsCode } = useSearch();
  const { t } = useTranslation();

  const materialText = (item.material.includes('Steel') && item.material.includes('Aluminum'))
    ? t('fr.tariffQuery.materialMixed')
    : (item.material.includes('Steel') ? t('fr.tariffQuery.materialSteel') : (item.material.includes('Aluminum') ? t('fr.tariffQuery.materialAluminum') : ''));

  const handleHtsCodeClick = (code: string) => {
    if (code) searchHtsCode(code);
  };

  const renderTariffInfo = (tariffs?: TariffTariffs) => {
    if (!tariffs) return null;
    return (
      <div className="mt-4 pt-4 border-t border-dashed border-border space-y-4">
        <h4 className="text-base font-semibold text-foreground">{t('fr.tariffQuery.applicableMeasures')}</h4>
        {tariffs.sec232?.applicable && (
          <div className="flex items-start">
            <div className="flex-shrink-0 text-sm font-semibold text-destructive bg-destructive/10 px-3 py-1 rounded-full">{t('fr.tariffQuery.sec232')}</div>
            <div className="ml-4">
              <p className="text-base font-bold text-destructive">{tariffs.sec232.rate}</p>
              <p className="text-sm text-muted-foreground">{tariffs.sec232.note}</p>
            </div>
          </div>
        )}
        {tariffs.sec301?.applicable && (
          <div className="flex items-start">
             <div className="flex-shrink-0 text-sm font-semibold text-warning-foreground bg-warning/10 px-3 py-1 rounded-full">{t('fr.tariffQuery.sec301')}</div>
             <div className="ml-4"><p className="text-base font-bold text-warning">{tariffs.sec301.rate}</p><p className="text-sm text-muted-foreground">{tariffs.sec301.note}</p></div>
          </div>
        )}
        {tariffs.ad_cvd?.applicable && (
          <div className="flex items-start">
            <div className="flex-shrink-0 text-sm font-semibold text-info-foreground bg-info/10 px-3 py-1 rounded-full">{t('fr.tariffQuery.adcvd')}</div>
            <div className="ml-4"><p className="text-base font-bold text-info">{t('fr.tariffQuery.highRisk')}</p><p className="text-sm text-muted-foreground">{tariffs.ad_cvd.note}</p></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl shadow-md overflow-hidden">
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-6 hover:no-underline hover:bg-accent">
            <div className="flex-grow pr-4 text-left">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-xl font-bold text-foreground">
                  {item.description}
                  {item.isDerivative && <Badge variant="secondary" className="ml-3 align-middle">{t('fr.tariffQuery.derivative')}</Badge>}
                </h2>
                <Badge
                  variant={item.material.includes('Steel') && item.material.includes('Aluminum') ? 'default' : (item.material.includes('Steel') ? 'secondary' : 'outline')}
                  className="flex-shrink-0 mt-1"
                >
                  {materialText}
                </Badge>
              </div>
              <p className="text-base text-muted-foreground mt-2">{t('fr.tariffQuery.chapter', { chapter: item.chapter })}</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
          <div className="divide-y divide-border">
            {item.details?.map((detail, index) => (
              <div key={index} className="py-3 flex items-start">
                <button
                  className="text-base font-mono text-primary w-36 flex-shrink-0 cursor-pointer hover:underline hover:text-primary/80 p-0 bg-transparent border-none text-left h-auto"
                  onClick={(e) => { e.stopPropagation(); handleHtsCodeClick(detail.hts || detail.sub_hts || '')}}
                >
                  {detail.hts || detail.sub_hts}
                </button>
                <span className="text-base text-foreground ml-4">{detail.desc || ''}</span>
              </div>
            ))}
          </div>
          {renderTariffInfo(item.tariffs)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

const TariffQuery = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'All' | 'Steel' | 'Aluminum'>('All');
  const { addNotification } = useNotifier();
  const [cacheToastShown, setCacheToastShown] = useState(false);
  const [networkToastShown, setNetworkToastShown] = useState(false);

  const tariffQuery = useTariffRulesQuery();
  const tariffData = tariffQuery.data ?? [];
  const isLoading = !tariffQuery.data && tariffQuery.isLoading;

  useEffect(() => {
    if (cacheToastShown) return;
    const cached = getCachedTariffRules();
    if (cached?.length) {
      addNotification(t('fr.tariffQuery.cachedLoaded', { count: cached.length }), 'success');
    }
    setCacheToastShown(true);
  }, [addNotification, cacheToastShown, t]);

  useEffect(() => {
    if (!tariffQuery.error) return;
    const message =
      tariffQuery.error instanceof Error ? tariffQuery.error.message : String(tariffQuery.error);
    addNotification(t('fr.tariffQuery.loadError', { message }), 'error');
  }, [tariffQuery.error, addNotification, t]);

  useEffect(() => {
    if (!tariffQuery.isSuccess || !tariffQuery.isFetchedAfterMount || networkToastShown) return;
    addNotification(t('fr.tariffQuery.remoteLoaded', { count: tariffData.length }), 'success');
    setNetworkToastShown(true);
  }, [tariffQuery.isSuccess, tariffQuery.isFetchedAfterMount, networkToastShown, tariffData.length, addNotification, t]);

  const filteredData = useMemo(() => {
    if (tariffData.length === 0) return [];

    return tariffData.filter(item => {
        const lowerSearchTerm = searchTerm.toLowerCase().trim();
        const matchesFilter = currentFilter === 'All' || item.material.includes(currentFilter);
        if (!matchesFilter) return false;
        if (lowerSearchTerm === '') return true;
        const matchesMain = item.description.toLowerCase().includes(lowerSearchTerm) || item.chapter.toLowerCase().includes(lowerSearchTerm);
        const matchesDetails = item.details?.some(d =>
            (d.hts || d.sub_hts || '').toLowerCase().includes(lowerSearchTerm) ||
            (d.desc || '').toLowerCase().includes(lowerSearchTerm)
        );
        return matchesMain || matchesDetails;
    }).sort((a, b) => (a.isDerivative ? 0 : 1) - (b.isDerivative ? 0 : 1));
  }, [tariffData, searchTerm, currentFilter]);

  return (
    <div>
      <Card className="mb-8 sticky top-4 z-10 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="w-5 h-5 text-muted-foreground absolute top-1/2 left-4 transform -translate-y-1/2" />
            <Input
              type="text"
              placeholder={isLoading ? t('fr.tariffQuery.searchPlaceholderLoading') : t('fr.tariffQuery.searchPlaceholder')}
              className="w-full h-12 p-4 pl-12 rounded-xl"
              disabled={isLoading}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <ToggleGroup type="single" value={currentFilter} onValueChange={(v: string) => v && setCurrentFilter(v as any)} className="p-1 rounded-xl bg-muted">
            <ToggleGroupItem value="All" className="px-4 py-2">{t('fr.tariffQuery.filterAll')}</ToggleGroupItem>
            <ToggleGroupItem value="Steel" className="px-4 py-2">{t('fr.tariffQuery.filterSteel')}</ToggleGroupItem>
            <ToggleGroupItem value="Aluminum" className="px-4 py-2">{t('fr.tariffQuery.filterAluminum')}</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Card>

      <main className="space-y-6 mt-8">
        {isLoading && (
            <div className="text-center py-16"><p className="text-lg text-muted-foreground">{t('status.loading')}</p></div>
        )}
        {!isLoading && filteredData.length === 0 && (
            <div className="text-center py-16">
              <EmptyState
                icon={<FileQuestion className="h-16 w-16" />}
                title={t('fr.tariffQuery.emptyTitle')}
                description={t('fr.tariffQuery.emptyDesc')}
              />
            </div>
        )}
        {filteredData.map((item, index) => (
          <ResultCard key={index} item={item} />
        ))}
      </main>
    </div>
  );
};

export default TariffQuery;
