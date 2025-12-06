import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch, HtsItem } from '../context/SearchContext';
import { Card, CardContent } from '../components/ui/Card';
import { HtsResultCard } from '../components/HtsResultCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { useNotifier } from '../context/NotificationContext';
import { EmptyState } from '../components/ui/EmptyState';
import { Search, Globe, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBaselineAdapterQuery } from '@/hooks/queries/useBaselineAdapterQuery';
import { useHtsDatasetQuery } from '@/hooks/queries/useHtsDatasetQuery';

// --- Helper Types ---
interface HtsReleaseInfo {
    name: string;
    description: string;
    title: string;
}

interface ChapterData {
    [chapter: string]: HtsItem[];
}

interface HtsStructureLink {
    label: string;
    filename?: string;
    description?: string;
    url?: string;
}

interface HtsStructureSection {
    section_label: string;
    section_title: string;
    section_range?: string;
    chapters: HtsStructureLink[];
}

interface HtsStructureData {
    metadata: {
        title: string;
        source_url: string;
    };
    about_hts: {
        title: string;
        description?: string;
        items: HtsStructureLink[];
    };
    general_notes: {
        title: string;
        description?: string;
        items: HtsStructureLink[];
    };
    appendices: {
        title: string;
        description?: string;
        items: HtsStructureLink[];
    };
    tariff_sections: HtsStructureSection[];
}

const normalizeChapterKey = (label: string) => {
    // Extract arabic or other numeric digits and normalize to "Chapter X" to match dataset keys.
    const match = label.match(/(\d+)/);
    if (match) return `Chapter ${parseInt(match[1], 10)}`;
    return label.trim();
};

// --- Recursive Tree for Search Results & Full Table Items ---
type HtsTreeNode = HtsItem & { children: HtsTreeNode[] };

const HtsTreeItem = ({
    node,
    allItems,
    searchTerm
}: {
    node: HtsTreeNode;
    allItems: HtsItem[];
    searchTerm: string;
}) => {
    const normalizedTerm = searchTerm.trim();
    const hasSearchTerm = normalizedTerm.length > 0;
    const isFullTableView = !hasSearchTerm;
    const initialOpen = isFullTableView ? Number(node.indent) < 1 : Number(node.indent) < 2;
    const [isOpen, setIsOpen] = useState(initialOpen);

    useEffect(() => {
        if (hasSearchTerm) {
            setIsOpen(true);
        } else {
            setIsOpen(isFullTableView ? Number(node.indent) < 1 : Number(node.indent) < 2);
        }
    }, [hasSearchTerm, isFullTableView, node.indent]);

    if (node.children && node.children.length > 0) {
        const handleRowToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, input, textarea, select')) return;
            setIsOpen(prev => !prev);
        };
        const handleKeyToggle = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRowToggle(e);
            }
        };
        return (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
                <div
                    className={`flex items-start gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2 cursor-pointer ${
                        hasSearchTerm ? 'border-l-4 border-l-sky-500 bg-sky-500/10 shadow-md' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={handleRowToggle}
                    onKeyDown={handleKeyToggle}
                >
                    <div className="flex-grow min-w-0">
                        <HtsResultCard item={node} allItems={allItems} searchTerm={searchTerm} />
                    </div>
                    <button
                        type="button"
                        className="flex-shrink-0 w-9 h-9 mt-4 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
                    >
                        <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                </div>
                <CollapsibleContent className="relative border-l-2 border-border ml-5 pl-2 mt-2 space-y-2">
                    {node.children.map((childNode: HtsTreeNode) => (
                        <HtsTreeItem key={childNode.htsno} node={childNode} allItems={allItems} searchTerm={searchTerm} />
                    ))}
                </CollapsibleContent>
            </Collapsible>
        );
    }
    return (
        <div className={`flex items-start pl-9 rounded-lg ${
            hasSearchTerm ? 'border-l-4 border-l-sky-500 bg-sky-500/10 shadow-md' : ''
        }`}>
            <div className="flex-grow min-w-0">
                <HtsResultCard item={node} allItems={allItems} searchTerm={searchTerm} />
            </div>
        </div>
    );
};

// --- Component to build a tree for a single chapter ---
const ChapterTree = ({ items, searchTerm }: { items: HtsItem[], searchTerm: string }) => {
    const chapterTree = useMemo(() => {
        if (!items || items.length === 0) return [];
        const tree: HtsTreeNode[] = [];
        const stack: { children: HtsTreeNode[]; indent: number | string }[] = [{ children: tree, indent: -1 }];
        for (const item of items) {
            const node: HtsTreeNode = { ...item, children: [] };
            const indent = Number(node.indent) || 0;
            while (Number(stack[stack.length - 1].indent) >= indent) {
                stack.pop();
            }
            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }
        return tree;
    }, [items]);

    return (
        <div className="space-y-2">
            {chapterTree.map(node => (
                <HtsTreeItem key={node.htsno} node={node} allItems={items} searchTerm={searchTerm} />
            ))}
        </div>
    );
};


// --- Component for Displaying Full HTS Table by Chapter ---
const FullHtsView = ({ chapters, searchTerm }: { chapters: ChapterData, searchTerm: string }) => {
    const chapterKeys = Object.keys(chapters).sort((a, b) => {
        const aNum = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const bNum = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return aNum - bNum;
    });
    // If filtering, default to all accordions open to show results
    const defaultOpen = searchTerm ? chapterKeys : [];

    return (
        <Accordion type="multiple" className="w-full space-y-2" defaultValue={defaultOpen}>
            {chapterKeys.map((chapter) => {
                const items = chapters[chapter];
                return (
                    <AccordionItem value={chapter} key={chapter} className="border rounded-lg bg-card">
                        <AccordionTrigger className="px-4 py-3 text-lg font-semibold hover:no-underline">
                            {chapter} ({items.length} items)
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-2 pb-4 border-t">
                            <ChapterTree items={items} searchTerm={searchTerm} />
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    );
};

const StructureLinkList = ({ items = [] }: { items?: HtsStructureLink[] }) => (
    <div className="grid gap-2">
        {items.map((item) => {
            const row = (
                <div className="flex items-start justify-between rounded-lg border bg-background px-4 py-3 transition hover:bg-accent/50">
                    <div className="text-left space-y-1">
                        <div className="font-medium leading-tight text-foreground">{item.label}</div>
                        {item.description && <p className="text-sm text-muted-foreground leading-snug">{item.description}</p>}
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
            );
            if (item.url) {
                return (
                    <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="block">
                        {row}
                    </a>
                );
            }
            return (
                <div key={item.label} className="block">
                    {row}
                </div>
            );
        })}
    </div>
);

const HtsStructureView = ({
    structure,
    chapterData,
    searchTerm,
}: {
    structure: HtsStructureData;
    chapterData?: ChapterData | null;
    searchTerm: string;
}) => {
    const { t } = useTranslation();
    const chapterLookup = useMemo(() => {
        if (!chapterData) return {} as ChapterData;
        const map: ChapterData = {};
        Object.keys(chapterData).forEach((key) => {
            map[normalizeChapterKey(key)] = chapterData[key];
        });
        return map;
    }, [chapterData]);
    const tariffSections = structure.tariff_sections || [];

    const normalizedTerm = searchTerm.trim();
    const hasSearchTerm = normalizedTerm.length > 0;

    // Keep only the outermost "Sections & Chapters" open; inner sections stay closed for performance
    const defaultOpenSections: string[] = [];

    return (
        <div className="space-y-3">
            <Accordion
                key={`structure-${hasSearchTerm ? normalizedTerm : 'browse'}`}
                type="multiple"
                className="space-y-3"
                defaultValue={hasSearchTerm ? ['sections'] : []}
            >
                <AccordionItem
                    value="intro"
                    className="rounded-xl border bg-muted/40 shadow-sm"
                >
                    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline flex items-center justify-between gap-4">
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {t('htsStructure.introduction')}
                            </span>
                            <span className="text-base md:text-lg font-semibold text-foreground">
                                {structure.about_hts.title}
                            </span>
                            {structure.about_hts.description && (
                                <span className="text-sm text-muted-foreground leading-snug">{structure.about_hts.description}</span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <StructureLinkList items={structure.about_hts.items} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem
                    value="notes"
                    className="rounded-xl border bg-muted/40 shadow-sm"
                >
                    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline flex items-center justify-between gap-4">
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {t('htsStructure.generalNotes')}
                            </span>
                            <span className="text-base md:text-lg font-semibold text-foreground">
                                {structure.general_notes.title}
                            </span>
                            {structure.general_notes.description && (
                                <span className="text-sm text-muted-foreground leading-snug">{structure.general_notes.description}</span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <StructureLinkList items={structure.general_notes.items} />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem
                    value="sections"
                    className="rounded-xl border bg-muted/40 shadow-sm"
                >
                    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline flex items-center justify-between gap-4">
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {t('htsStructure.tariffSchedule')}
                            </span>
                            <span className="text-base md:text-lg font-semibold text-foreground">
                                {t('htsStructure.sectionsChapters')}
                            </span>
                            {chapterData && (
                                <span className="text-xs text-muted-foreground">
                                    {hasSearchTerm ? t('htsStructure.searchMatched') : t('htsStructure.localLoaded')}
                                </span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <Accordion
                            key={`sections-${hasSearchTerm ? normalizedTerm : 'browse'}`}
                            type="multiple"
                            className="space-y-2"
                            defaultValue={defaultOpenSections}
                        >
                            {tariffSections.map((section) => {
                                const sectionChapters = chapterData
                                    ? section.chapters.filter((ch) => chapterLookup[normalizeChapterKey(ch.label)])
                                    : section.chapters;

                                if (chapterData && sectionChapters.length === 0) return null;

                                // Keep chapters closed by default even when searching to avoid heavy upfront renders
                                const defaultOpenChapters: string[] = [];

                                return (
                                    <AccordionItem
                                    key={section.section_label}
                                    value={section.section_label}
                                    className="border rounded-lg bg-card"
                                >
                                        <AccordionTrigger className="px-4 py-3 text-left hover:no-underline flex items-start justify-between gap-4">
                                            <div className="flex flex-col text-left max-w-3xl">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {section.section_label}
                                                    </span>
                                                <span className="text-base font-semibold text-foreground">
                                                    {section.section_title}
                                                </span>
                                                {section.section_range && (
                                                    <span className="text-sm text-muted-foreground">{section.section_range}</span>
                                                )}
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-3">
                                            <Accordion
                                                key={`chapters-${hasSearchTerm ? normalizedTerm : 'browse'}-${section.section_label}`}
                                                type="multiple"
                                                className="space-y-2"
                                                defaultValue={hasSearchTerm ? sectionChapters.map((chapter) => normalizeChapterKey(chapter.label)) : defaultOpenChapters}
                                            >
                                                {sectionChapters.map((chapter) => {
                                                    const chapterKey = normalizeChapterKey(chapter.label);
                                                    const items = chapterLookup[chapterKey];
                                                    const hasItems = Boolean(items && items.length > 0);
                                                    return (
                                                        <AccordionItem
                                                            key={chapterKey}
                                                            value={chapterKey}
                                                            className="border rounded-md bg-muted/30"
                                                        >
                                                            <AccordionTrigger className="px-3 py-2 text-left hover:no-underline flex items-start justify-between gap-3">
                                                                <div className="flex flex-col text-left max-w-2xl">
                                                                    <span className="font-medium leading-tight text-foreground">
                                                                        {chapter.label}
                                                                    </span>
                                                                    {chapter.description && (
                                                                        <span className="text-sm text-muted-foreground">
                                                                            {chapter.description}
                                                                        </span>
                                                                    )}
                                                                    {hasItems && (
                                                                        <span className="text-xs text-primary">
                                                                            {items?.length ?? 0} 條目
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="px-3 pb-3 space-y-2">
                                                                {hasItems ? (
                                                                    <ChapterTree items={items as HtsItem[]} searchTerm={searchTerm} />
                                                                ) : (
                                                                    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                                                                        <span>{chapter.description || '尚未載入章節內容'}</span>
                                                                        {chapter.url && (
                                                                            <a
                                                                                href={chapter.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-primary hover:underline text-xs"
                                                                            >
                                                                                查看來源
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem
                    value="appendices"
                    className="rounded-xl border bg-muted/40 shadow-sm"
                >
                    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline flex items-center justify-between gap-4">
                        <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {t('htsStructure.appendices')}
                            </span>
                            <span className="text-base md:text-lg font-semibold text-foreground">
                                {structure.appendices.title}
                            </span>
                            {structure.appendices.description && (
                                <span className="text-sm text-muted-foreground leading-snug">{structure.appendices.description}</span>
                            )}
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <StructureLinkList items={structure.appendices.items} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};


const HtsDatabase = () => {
    const { t, i18n } = useTranslation();
    const { htsSearchTerm } = useSearch();
    const { addNotification } = useNotifier();

    // Unified search term for both modes
    const [localSearchTerm, setLocalSearchTerm] = useState(htsSearchTerm);

    // State for API Search View
    const [isApiSearching, setIsApiSearching] = useState(false);
    const [apiResults, setApiResults] = useState<HtsItem[]>([]);
    const [baselineArgs, setBaselineArgs] = useState<{ year: string; searchTerm: string } | null>(null);
    const baselineQuery = useBaselineAdapterQuery({
        year: baselineArgs?.year ?? '',
        searchTerm: baselineArgs?.searchTerm ?? '',
        enabled: Boolean(baselineArgs),
    });

    // State for Full Table View
    const [showFullTable, setShowFullTable] = useState(false);
    const [isFullTableLoading, setIsFullTableLoading] = useState(false);
    const [fullHtsData, setFullHtsData] = useState<ChapterData | null>(null);
    const [versionWarning, setVersionWarning] = useState<string | null>(null);
    const [displayFullHtsData, setDisplayFullHtsData] = useState<ChapterData | null>(null);
    
    const [releaseInfo, setReleaseInfo] = useState<HtsReleaseInfo | null>(null);
    const [fallbackToLoad, setFallbackToLoad] = useState<string | null>(null);
    const [datasetRequest, setDatasetRequest] = useState<{ fileName: string; isFallback: boolean; info: HtsReleaseInfo | null } | null>(null);
    const datasetQuery = useHtsDatasetQuery(datasetRequest?.fileName ?? '', Boolean(datasetRequest));
    const [promptLoadFallback, setPromptLoadFallback] = useState(false);
    const [structureData, setStructureData] = useState<HtsStructureData | null>(null);
    const [isStructureLoading, setIsStructureLoading] = useState(false);
    const [structureError, setStructureError] = useState<string | null>(null);


    // --- Effects for API Search View State ---
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('htsdb_state');
            if (raw) {
                const saved = JSON.parse(raw);
                if (typeof saved?.term === 'string' && !showFullTable) setLocalSearchTerm(saved.term);
                if (Array.isArray(saved?.results)) setApiResults(saved.results as HtsItem[]);
            }
        } catch {}
    }, [showFullTable]);

    useEffect(() => {
        try {
            if (!showFullTable) {
                const payload = { term: localSearchTerm, results: apiResults };
                sessionStorage.setItem('htsdb_state', JSON.stringify(payload));
            }
        } catch {}
    }, [localSearchTerm, apiResults, showFullTable]);

    useEffect(() => {
        const loadStructure = async () => {
            setIsStructureLoading(true);
            setStructureError(null);
            try {
                const lang = (i18n.language || '').toLowerCase();
                const isZhTw = lang.startsWith('zh') && (lang.includes('tw') || lang.includes('hant'));
                const path = isZhTw ? '/assets/data/HTSUSstructure_zhtw.json' : '/assets/data/HTSUSstructure.json';
                const res = await fetch(path);
                if (!res.ok) throw new Error(`無法載入 HTSUS 結構檔案: ${path}`);
                const data = await res.json();
                setStructureData(data as HtsStructureData);
            } catch (e: any) {
                const message = e?.message ?? 'structure load error';
                setStructureError(message);
                addNotification(message, 'error');
            } finally {
                setIsStructureLoading(false);
            }
        };
        loadStructure();
    }, [addNotification, i18n.language]);

    useEffect(() => {
        if (htsSearchTerm && apiResults.length === 0 && !showFullTable) {
            setLocalSearchTerm(htsSearchTerm);
            handleApiSearch(htsSearchTerm);
        }
    }, [htsSearchTerm, showFullTable]);

    const findBestFallback = React.useCallback(async (currentReleaseInfo: HtsReleaseInfo) => {
        const name = currentReleaseInfo.name;
        const match = name.match(/^(\d{4})HTSRev(\d+)$/);
        if (!match) {
            setVersionWarning(t('fr.hts.versionFormatError'));
            return;
        }
    
        const year = parseInt(match[1], 10);
        let revision = parseInt(match[2], 10);
    
        setIsFullTableLoading(true);
        setPromptLoadFallback(false);

        for (let i = 0; i < 10; i++) { // Try previous 10 revisions
            revision--;
            if (revision <= 0) break;
    
            const fallbackName = `${year}HTSRev${revision}.json`;
            const fallbackPath = `/assets/data/${fallbackName}`;
            
            try {
                const res = await fetch(fallbackPath, { method: 'HEAD' });
                if (res.ok) {
                    setFallbackToLoad(fallbackName);
                    setPromptLoadFallback(true);
                    setIsFullTableLoading(false);
                    return; 
                }
            } catch (e) { /* Ignore fetch errors and continue trying */ }
        }
        setIsFullTableLoading(false);
        setVersionWarning(t('fr.hts.versionFallbackFailed', { desc: currentReleaseInfo.description }));

    }, [t]);

    const tryLoadHtsFile = useCallback((fileName: string, isFallback: boolean, currentReleaseInfo: HtsReleaseInfo | null) => {
        setIsFullTableLoading(true);
        setVersionWarning(null);
        setPromptLoadFallback(false);
        setFallbackToLoad(null);
        setDatasetRequest({ fileName, isFallback, info: currentReleaseInfo });
    }, []);

    // --- Effect for Full Table View ---
    useEffect(() => {
        if (!showFullTable) {
            setFullHtsData(null);
            setDisplayFullHtsData(null);
            setVersionWarning(null);
            setPromptLoadFallback(false);
            setFallbackToLoad(null);
            setReleaseInfo(null);
            return;
        }

        const loadInitialData = async () => {
            setIsFullTableLoading(true);
            try {
                const releaseRes = await fetch('/.netlify/functions/get-hts-current-release');
                if (!releaseRes.ok) throw new Error('??????????');
                const info: HtsReleaseInfo = await releaseRes.json();
                setReleaseInfo(info);
                const expectedFileName = `${info.name}.json`;
                await tryLoadHtsFile(expectedFileName, false, info);
            } catch (e: any) {
                addNotification(t('fr.hts.versionLoadFailed', { message: e.message }), 'error');
                 setVersionWarning(t('fr.hts.versionLoadFailed', { message: e.message }));
                 setIsFullTableLoading(false);
            }
        };

        loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showFullTable, addNotification]);

    // --- Effect for filtering full HTS data ---
    useEffect(() => {
        if (!showFullTable || !fullHtsData) return;

        const term = localSearchTerm.toLowerCase();
        if (!term) {
            setDisplayFullHtsData(fullHtsData);
            return;
        }

        const newChapters: ChapterData = {};

        for (const chapterKey in fullHtsData) {
            const items = fullHtsData[chapterKey];
            const matchingIndices = new Set<number>();

            items.forEach((item, index) => {
                if (item.description.toLowerCase().includes(term) || item.htsno.toLowerCase().includes(term)) {
                    matchingIndices.add(index);
                }
            });

            if (matchingIndices.size === 0) continue;

            const includedIndices = new Set<number>(matchingIndices);
            matchingIndices.forEach(matchIndex => {
                const matchIndent = Number(items[matchIndex].indent);
                let currentIndent = matchIndent;
                for (let i = matchIndex - 1; i >= 0; i--) {
                    const parentCandidateIndent = Number(items[i].indent);
                    if (parentCandidateIndent < currentIndent) {
                        includedIndices.add(i);
                        currentIndent = parentCandidateIndent;
                        if (currentIndent === 0) break;
                    }
                }
            });

            const finalItems = items.filter((_, index) => includedIndices.has(index));
            if (finalItems.length > 0) {
                newChapters[chapterKey] = finalItems;
            }
        }
        setDisplayFullHtsData(newChapters);

    }, [localSearchTerm, fullHtsData, showFullTable]);


    // --- Handlers and Memos ---
    const handleApiSearch = (termOverride?: string) => {
        const term = (termOverride ?? localSearchTerm).trim();
        if (!term) {
            setApiResults([]);
            return;
        }
        setIsApiSearching(true);
        setBaselineArgs({ year: new Date().getFullYear().toString(), searchTerm: term });
    };

    useEffect(() => {
        if (baselineQuery.error) {
            const message =
                baselineQuery.error instanceof Error ? baselineQuery.error.message : String(baselineQuery.error);
            addNotification(t('fr.hts.advancedSearchFailed', { message }), 'error');
            setApiResults([]);
            setIsApiSearching(false);
            return;
        }
        const payload = baselineQuery.data as any;
        if (!payload) return;
        const rawResults = Array.isArray(payload?.results) ? payload.results : [];
        const results = rawResults.map((item: any) => ({
            htsno: item.htsno || '',
            description: item.description || '',
            indent: item.indent || '0',
            general: item.general || '',
            special: item.special || '',
            other: item.other || item.col2 || '',
            statisticalSuffix: item.statisticalSuffix || '',
            units: item.units || [],
            footnotes: item.footnotes || [],
            extra_duties: item.extra_duties || undefined,
            investigations: item.investigations || [],
        }));
        setApiResults(results);
        setIsApiSearching(false);
    }, [baselineQuery.data, baselineQuery.error]);
    const handleSearch = () => {
        if (showFullTable) {
            // In full table mode, search is live filtering, button does nothing.
            return;
        }
        handleApiSearch();
    }

    const handleLoadFallback = () => {
        if (fallbackToLoad) {
            tryLoadHtsFile(fallbackToLoad, true, releaseInfo);
        }
    };
    
    React.useEffect(() => {
        if (!datasetRequest) return;
        if (datasetQuery.error) {
            const message = datasetQuery.error instanceof Error ? datasetQuery.error.message : String(datasetQuery.error);
            addNotification(`file load error${message}`, 'error');
            setVersionWarning(t('fr.hts.fileLoadError', { message }));
            if (!datasetRequest.isFallback && datasetRequest.info) {
                findBestFallback(datasetRequest.info);
            } else {
                setIsFullTableLoading(false);
            }
            return;
        }
        if (!datasetQuery.data) return;
        const data: HtsItem[] = Array.isArray(datasetQuery.data) ? datasetQuery.data : [];
        const chapters: ChapterData = {};
        for (const item of data) {
            if (!item.htsno || item.htsno.length < 2) continue;
            const chapterNum = item.htsno.substring(0, 2);
            const chapterKey = normalizeChapterKey(`Chapter ${parseInt(chapterNum, 10)}`);
            if (!chapters[chapterKey]) chapters[chapterKey] = [];
            chapters[chapterKey].push(item);
        }
        setFullHtsData(chapters);
        setDisplayFullHtsData(chapters);
        if (datasetRequest.isFallback && datasetRequest.info) {
            setVersionWarning(t('fr.hts.fileLoadFallback', { name: datasetRequest.fileName.replace('.json', ''), desc: datasetRequest.info.description }));
        }
        setIsFullTableLoading(false);
    }, [datasetRequest, datasetQuery.data, datasetQuery.error]);

    const apiHtsTree = useMemo(() => {
        if (!apiResults || apiResults.length === 0) return [];
        const tree: (HtsItem & { children: any[] })[] = [];
        const stack: { children: any[], indent: number | string }[] = [{ children: tree, indent: -1 }];
        for (const item of apiResults) {
            const node = { ...item, children: [] };
            const indent = Number(node.indent) || 0;
            while (Number(stack[stack.length - 1].indent) >= indent) {
                stack.pop();
            }
            stack[stack.length - 1].children.push(node);
            stack.push(node);
        }
        return tree;
    }, [apiResults]);

    const shouldShowStructureIntro = !showFullTable && !localSearchTerm && !isApiSearching && apiResults.length === 0;


    return (
        <div className="p-4 lg:p-6">
            <Card className="mb-8 sticky top-4 z-10 bg-background/95 backdrop-blur-sm">
                <CardContent className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <Label htmlFor="hts-database-search" className="sr-only">{t('fr.hts.searchLabel')}</Label>
                        <div className="relative flex-grow">
                            <Search className="w-5 h-5 text-muted-foreground absolute top-1/2 left-4 transform -translate-y-1/2" />
                            <Input
                                type="text"
                                id="hts-database-search"
                                placeholder={showFullTable ? t('fr.hts.placeholderFull') : t('fr.hts.placeholderApi')}
                                className="w-full h-12 p-4 pl-12 rounded-xl"
                                value={localSearchTerm}
                                onChange={e => setLocalSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !isApiSearching && handleSearch()}
                            />
                        </div>

                        {!showFullTable && (
                            <Button onClick={handleSearch} disabled={isApiSearching} size="lg" className="h-12">
                                {isApiSearching ? t('fr.hts.searching') : t('fr.hts.search')}
                            </Button>
                        )}

                        <div className="flex items-center space-x-2 pt-2 md:pt-0 flex-shrink-0">
                            <Switch id="full-table-switch" checked={showFullTable} onCheckedChange={(checked: boolean) => {
                                setShowFullTable(checked);
                                setLocalSearchTerm(''); // Clear search term when toggling
                            }} />
                            <Label htmlFor="full-table-switch">{t('fr.hts.toggleFull')}</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <main className="space-y-6">
                {/* Full Table View */}
                {showFullTable && (
                    <>
                        {isFullTableLoading && (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                            </div>
                        )}
                        {promptLoadFallback && fallbackToLoad && releaseInfo && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{t('fr.hts.warningTitle')}</AlertTitle>
                                <AlertDescription>
                                    <div className="flex flex-col gap-2">
                                        <span>{t('fr.hts.fallbackDesc1', { desc: releaseInfo.description })}</span>
                                        <span>{t('fr.hts.fallbackDesc2', { name: fallbackToLoad.replace('.json', '') })}</span>
                                        <div className="mt-2">
                                            <Button onClick={handleLoadFallback} size="sm">{t('fr.hts.fallbackConfirm')}</Button>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        {!promptLoadFallback && versionWarning && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{t('fr.hts.warningTitle')}</AlertTitle>
                                <AlertDescription>{versionWarning}</AlertDescription>
                            </Alert>
                        )}
                        {isStructureLoading && !displayFullHtsData && (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                            </div>
                        )}
                        {structureData && (
                            <HtsStructureView
                                structure={structureData}
                                chapterData={displayFullHtsData}
                                searchTerm={localSearchTerm}
                            />
                        )}
                        {!structureData && displayFullHtsData && (
                            <FullHtsView chapters={displayFullHtsData} searchTerm={localSearchTerm} />
                        )}
                    </>
                )}

                {/* API Search Results View */}
                {!showFullTable && (
                    <>
                        {isApiSearching && (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i} className="p-4 space-y-3">
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-5/6" />
                                    </Card>
                                ))}
                            </div>
                        )}
                        {shouldShowStructureIntro && (
                            <div className="space-y-4">
                                {isStructureLoading && (
                                    <div className="space-y-3">
                                        {[...Array(4)].map((_, i) => (
                                            <Skeleton key={i} className="h-10 w-full rounded-lg" />
                                        ))}
                                    </div>
                                )}
                                {!isStructureLoading && structureData && (
                                    <HtsStructureView structure={structureData} searchTerm={localSearchTerm} />
                                )}
                                {!isStructureLoading && !structureData && (
                                    <div className="py-16">
                                        <EmptyState
                                            icon={<Globe className="h-16 w-16" />}
                                            title={t('fr.hts.emptyTitle')}
                                            description={structureError || t('fr.hts.emptyDesc')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {!isApiSearching && apiResults.length === 0 && !shouldShowStructureIntro && (
                            <div className="py-16">
                                <EmptyState
                                    icon={<Globe className="h-16 w-16" />}
                                    title={t('fr.hts.emptyTitle')}
                                    description={t('fr.hts.emptyDesc')}
                                />
                            </div>
                        )}
                        {apiHtsTree.map(node => (
                            <HtsTreeItem key={node.htsno} node={node} allItems={apiResults} searchTerm={localSearchTerm} />
                        ))}
                    </>
                )}
            </main>
        </div>
    );
};

export default HtsDatabase;



