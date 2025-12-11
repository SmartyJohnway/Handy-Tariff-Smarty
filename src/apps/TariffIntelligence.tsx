/**
 * @file TariffIntelligence.tsx
 * @description Tariff Intelligence Dashboard: A central hub for viewing tariff rates, trade data, and AD/CVD case information.
 * @version 2.6.1
 * @date 2025-11-29
 */
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, Star, AlertTriangle, List, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';

import { useResearchTrail } from '@/context/ResearchTrailContext';
import { useHtsDetailsQuery } from '@/hooks/queries/useHtsDetailsQuery';
import { useAdcvdTrackerQuery } from '@/hooks/queries/useAdcvdTrackerQuery';
import { useProgramNamesQuery } from '@/hooks/queries/useProgramNamesQuery';
import { useCompanyRatesQuery } from '@/hooks/queries/useCompanyRatesQuery';

import { HTSDetailsCard } from '@/components/intelligence/HTSDetailsCard';
import { ADCVDCoutryTracker } from '@/components/intelligence/ADCVDCoutryTracker';
import { MarketTrendsChart } from '@/components/intelligence/MarketTrendsChart';
import { SearchBar } from '@/components/ui/SearchBar';
import { FavoritesModal } from '@/components/intelligence/FavoritesList';
import { CompanyRatesModal } from '@/components/intelligence/CompanyRatesModal';
import { IDSLinksCard } from '@/components/intelligence/IDSLinksCard';
import { RelatedFRCard } from '@/components/intelligence/RelatedFRCard';
import { TariffCalculator } from '@/components/intelligence/TariffCalculator';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTranslation } from 'react-i18next';
import { AdcvdSearchCard } from '@/components/AdcvdSearchCard';

import { useIntelligence } from '@/context/IntelligenceContext';
import { useHtsReleaseListQuery } from '@/hooks/queries/useHtsReleaseListQuery';
import { useSearch } from '@/context/SearchContext';

const formatHtsWithDots = (raw: string | undefined | null) => {
  const input = String(raw || '').trim();
  if (!input) return '';
  if (input.includes('.')) return input.replace(/\.{2,}/g, '.');
  const digits = input.replace(/\D/g, '');
  if (digits.length < 4) return input;
  const parts: string[] = [];
  parts.push(digits.slice(0, 4));
  if (digits.length >= 6) parts.push(digits.slice(4, 6));
  if (digits.length >= 8) parts.push(digits.slice(6, 8));
  if (digits.length >= 10) parts.push(digits.slice(8, 10));
  if (digits.length >= 12) parts.push(digits.slice(10, 12));
  return parts.join('.');
};

const formatHtsReleaseDate = (raw?: string | number | null) => {
  if (raw === null || raw === undefined || raw === '') return '';
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}/${month}/${day}`;
  } catch {
    return String(raw);
  }
};

// --- Main Component ---
export function TariffIntelligence() {
  const { t } = useTranslation();
  const {
    searchTerm, setSearchTerm,
    activeHts, setActiveHts,
    isSearchLoading, setIsSearchLoading,
    searchError, setSearchError,
    tariffData, setTariffData,
    adcvdCountryList, setAdcvdCountryList,
    idsLinks, setIdsLinks,
    adcvdUpdatedAt, setAdcvdUpdatedAt
  } = useIntelligence();
  const { htsSearchTerm, htsNavToken } = useSearch();
  const lastProcessedToken = React.useRef(0);

  const [favorites, setFavorites] = useState<{ hts: string; note: string }[]>([]);
  const [queryHts, setQueryHts] = useState('');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  
  const { addTrailItem } = useResearchTrail();

  const { data: programsLookupData } = useProgramNamesQuery();
  const programsLookup = programsLookupData ?? null;
  const htsReleaseListQuery = useHtsReleaseListQuery();
  const htsRelease = React.useMemo(() => {
    const list = Array.isArray(htsReleaseListQuery.data) ? htsReleaseListQuery.data : [];
    const current = list.find(item => (item?.status || '').toLowerCase() === 'current');
    return current || list[0] || null;
  }, [htsReleaseListQuery.data]);

  const normalizedQueryHts = queryHts || '';
  const tariffQuery = useHtsDetailsQuery(normalizedQueryHts);
  const adcvdQuery = useAdcvdTrackerQuery(normalizedQueryHts);

  // Company Modal state
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyCountry, setCompanyCountry] = useState<string | null>(null);
  const [companyRows, setCompanyRows] = useState<any[]>([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyDocNumber, setCompanyDocNumber] = useState<string | null>(null);
  const companyRatesQuery = useCompanyRatesQuery({
    documentNumber: companyDocNumber ?? '',
    enabled: Boolean(companyDocNumber),
  });

  const isTariffLoading =
    Boolean(queryHts) && (tariffQuery.isLoading || (tariffQuery.isFetching && !tariffData));
  const isAdCvdLoading = Boolean(queryHts) && adcvdQuery.isFetching;

  // Combined loading state
  useEffect(() => {
    const loading = Boolean(queryHts) && (tariffQuery.isFetching || adcvdQuery.isFetching);
    setIsSearchLoading(loading);
  }, [queryHts, tariffQuery.isFetching, adcvdQuery.isFetching, setIsSearchLoading]);

  useEffect(() => {
    if (tariffQuery.data) {
      setTariffData((tariffQuery.data as any) || null);
    }
  }, [tariffQuery.data, setTariffData]);

  useEffect(() => {
    if (tariffQuery.error) {
      const message =
        tariffQuery.error instanceof Error ? tariffQuery.error.message : String(tariffQuery.error);
      setSearchError(message);
    }
  }, [tariffQuery.error, setSearchError]);

  useEffect(() => {
    if (adcvdQuery.data) {
      setAdcvdCountryList(adcvdQuery.data.countries);
      setIdsLinks(adcvdQuery.data.idsLinks);
      setAdcvdUpdatedAt(adcvdQuery.data.updatedAt);
    }
  }, [adcvdQuery.data, setAdcvdCountryList, setIdsLinks, setAdcvdUpdatedAt]);

  useEffect(() => {
    if (adcvdQuery.error) {
      console.error('AD/CVD data fetch error:', adcvdQuery.error);
    }
  }, [adcvdQuery.error]);

  // Fetch favorites from local storage on mount
  useEffect(() => {
    try {
      const storedFavorites = JSON.parse(localStorage.getItem('tariff_favorites') || '[]');
      setFavorites(storedFavorites);
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  }, []);

  // --- Main Data Fetching Function ---
  async function handleSearch(termOverride?: string) {
    const basis = (termOverride ?? searchTerm) || '';
    const rawHts = (typeof basis === 'string') ? basis.replace(/\./g, '').trim() : '';
    if (!rawHts) return;

    const sanitized = rawHts.replace(/\D/g, '');
    if (sanitized.length < 4) {
      setSearchError(t('tariff.enterDigits'));
      return;
    }

    const normalizedHts = sanitized.slice(0, 12);

    addTrailItem({ type: 'search', term: normalizedHts } as any);
    setActiveHts(formatHtsWithDots(basis) || normalizedHts);
    
    // Reset states and set loading flags
    setSearchError(null);
    setTariffData(null);
    setAdcvdCountryList([]);
    setIdsLinks([]);
    setAdcvdUpdatedAt(null);
    setIsSearchLoading(true);
    setQueryHts(normalizedHts);  }

  // Effect to handle navigation from other components (e.g., HTS card click)
  useEffect(() => {
    if (htsNavToken > lastProcessedToken.current) {
      lastProcessedToken.current = htsNavToken;
      if (htsSearchTerm) {
        setSearchTerm(htsSearchTerm);
        handleSearch(htsSearchTerm);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htsNavToken]);
  
  // Initialize from ?hts=... or ?term=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const incoming = params.get('hts') || params.get('term');
      if (incoming && incoming.trim()) {
        setSearchTerm(incoming);
        handleSearch(incoming);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCompanyModal(country: string, docNumber: string) {
    if (!docNumber) return;
    setCompanyCountry(country);
    setCompanyOpen(true);
    setCompanyError(null);
    setCompanyRows([]);
    setCompanyDocNumber(docNumber);
    setCompanyLoading(true);
  }

  useEffect(() => {
    if (!companyDocNumber) return;
    if (companyRatesQuery.isFetching) {
      setCompanyLoading(true);
      return;
    }
    setCompanyLoading(false);
    if (companyRatesQuery.error) {
      const message =
        companyRatesQuery.error instanceof Error ? companyRatesQuery.error.message : String(companyRatesQuery.error);
      setCompanyError(message);
      return;
    }
    const data = companyRatesQuery.data;
    if (!data) return;
    if (data.special_case) {
      setCompanyError(`This document has a special case: ${data.special_case}. Please check the Federal Register directly.`);
      setCompanyRows([{ company: 'N/A', rate: data.source_url || `https://www.federalregister.gov/d/${companyDocNumber}` }]);
      return;
    }
    setCompanyRows(Array.isArray(data?.rates) ? data.rates : []);
  }, [companyDocNumber, companyRatesQuery.data, companyRatesQuery.error, companyRatesQuery.isFetching]);

  // --- Favorite Functions (Unchanged) ---
  function saveFavorites(newFavorites: { hts: string; note: string }[]) {
    setFavorites(newFavorites);
    try {
      localStorage.setItem('tariff_favorites', JSON.stringify(newFavorites));
    } catch (e) {
      console.error('Failed to save favorites to localStorage', e);
    }
  }

  function addFavorite() {
    if (!activeHts || favorites.some(f => f.hts === activeHts)) return;
    const newFavorites = [...favorites, { hts: activeHts, note: `Added on ${new Date().toLocaleDateString()}` }];
    saveFavorites(newFavorites);
  }

  function removeFavorite(htsToRemove: string) {
    const newFavorites = favorites.filter(f => f.hts !== htsToRemove);
    saveFavorites(newFavorites);
  }

  const handleSelectFavorite = (hts: string) => {
    setSearchTerm(hts);
    handleSearch(hts);
  };

  const renderSkeletons = () => (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  const renderMainContent = () => {
    // Show skeleton if the main tariff data is loading
    if (isTariffLoading) {
      return renderSkeletons();
    }
    if (tariffData) {
      return (
        <>
          <HTSDetailsCard data={tariffData} />
          <MarketTrendsChart htsCode={activeHts} defaultAdcvdCountries={adcvdCountryList.map(c => c.country)} />
          <AdcvdSearchCard htsCode={activeHts} />
        </>
      );
    }
    // Show empty state only if not loading and no data/error
    if (!isSearchLoading && !searchError) {
        return (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title={t('tariff.welcomeTitle')}
            description={t('tariff.welcomeDesc')}
          />
        );
    }
    return null; // Return null while loading or if there's an error to let the error alert show
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex flex-shrink-0 items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t('tariff.title')}</h1>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-4 sm:w-auto sm:flex-1 sm:flex-nowrap">
            <div className="order-first w-full min-w-[220px] sm:order-none sm:w-auto sm:flex-1">
              <SearchBar
                className="mb-0"
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onSearch={() => handleSearch()}
                isLoading={isSearchLoading}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={addFavorite} disabled={!activeHts} className="h-10">
                <Star className="mr-2 h-4 w-4" />
                {t('tariff.addFavorite')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFavoritesOpen(true)} className="h-10">
                <List className="mr-2 h-4 w-4" />
                {t('tariff.favorites')}
              </Button>
            </div>
            <div className="hidden h-[54px] min-w-[240px] max-w-[240px] flex-col justify-center rounded-xl border bg-muted/50 px-3 py-2 text-xs leading-tight sm:text-sm lg:flex">
              {htsReleaseListQuery.isLoading ? (
                <span className="text-muted-foreground whitespace-nowrap">{t('tariff.htsLoading')}</span>
              ) : htsRelease ? (
                <>
                  <a
                    href="https://hts.usitc.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline truncate"
                    title={htsRelease.description || htsRelease.title || undefined}
                  >
                    {htsRelease.description || htsRelease.title || 'N/A'}
                  </a>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {t('tariff.releaseDate')}：{formatHtsReleaseDate(
                      htsRelease.formattedDate
                      || htsRelease.date
                      || htsRelease.releaseStartDate
                    ) || 'N/A'}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground whitespace-nowrap">{t('tariff.htsMissing')}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full px-6 py-6">
        {searchError && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('tariff.searchErrorTitle')}</AlertTitle>
                <AlertDescription>
                    {searchError}
                </AlertDescription>
            </Alert>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 lg:gap-6">
          {/* --- Left Column --- */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {renderMainContent()}
          </div>

          {/* --- Right Column --- */}
          <div className="flex flex-col gap-6 mt-6 lg:mt-0">
            {isTariffLoading ? (
              <Card>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
              </Card>
            ) : tariffData ? (
              <>
                <TariffCalculator
                  htsCode={activeHts}
                  tariffData={tariffData}
                  programsLookup={programsLookup}
                />
                <ADCVDCoutryTracker
                  isLoading={isAdCvdLoading} // Use separate loading state
                  countryList={adcvdCountryList}
                  updatedAt={adcvdUpdatedAt}
                  onViewDetails={openCompanyModal}
                />
                <IDSLinksCard isLoading={isAdCvdLoading} links={idsLinks} />
                <RelatedFRCard hts={activeHts} rawHts={searchTerm} defaultPerPage={5} />
              </>
            ) : (
              <div className="hidden lg:block">
                 <EmptyState
                    icon={<Search className="h-12 w-12" />}
                    title={t('tariff.toolsTitle')}
                    description={t('tariff.toolsDesc')}
                  />
              </div>
            )}
          </div>
        </div>
      </main>

      <CompanyRatesModal
        isOpen={companyOpen}
        onClose={() => setCompanyOpen(false)}
        country={companyCountry}
        isLoading={companyLoading}
        error={companyError}
        rows={companyRows}
      />
      <FavoritesModal
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        favorites={favorites}
        onSelect={handleSelectFavorite}
        onRemove={removeFavorite}
      />
    </div>
  );
}
