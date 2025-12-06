import React from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleJson } from '@/components/ui/CollapsibleJson';
import type { NormalizedFRDoc } from '@/lib/frNormalize';

const isEmptyJsonString = (value: string) => {
  const compact = value.replace(/\s+/g, '');
  return compact === '{}' || compact === '[]';
};

const hasValue = (value?: React.ReactNode) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isEmptyJsonString(trimmed)) return false;
    return true;
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const Section: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
  if (!hasValue(value)) return null;
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs whitespace-pre-line leading-relaxed break-words">{value}</div>
    </div>
  );
};

const formatList = (items?: Array<string | number | null> | null, fallback?: string) => {
  if (!items || items.length === 0) return fallback || null;
  const filtered = items.map((x) => (x == null ? '' : String(x))).filter(Boolean);
  if (filtered.length === 0) return fallback || null;
  return filtered.join(', ');
};

export const DocumentDetails: React.FC<{ doc: NormalizedFRDoc }> = ({ doc }) => {
  const { t } = useTranslation();
  const meta = [doc.document_number, doc.type, doc.publication_date].filter(Boolean).join(' | ');
  const agencies = doc.agencies_text || formatList(doc.agency_names);
  const topics =
    Array.isArray(doc.topics) && doc.topics.length > 0
      ? doc.topics
          .map((t: any) => (typeof t === 'string' ? t : t?.name || t?.title || ''))
          .filter(Boolean)
          .join(', ')
      : null;
  const docketInfo = doc.docket_ids?.length ? doc.docket_ids.join(', ') : doc.docket_id;
  const cfrRefs =
    Array.isArray(doc.cfr_references) && doc.cfr_references.length > 0
      ? doc.cfr_references
          .map((ref: any) => {
            if (!ref) return '';
            if (typeof ref === 'string') return ref;
            if (typeof ref === 'object') {
              const parts = [ref.title, ref.part];
              return parts.filter(Boolean).join(' ');
            }
            return String(ref);
          })
          .filter(Boolean)
          .join(', ')
      : null;

  const pageRange =
    doc.start_page || doc.end_page
      ? `${doc.start_page ?? '?'} - ${doc.end_page ?? '?'}${doc.page_length ? ` (${doc.page_length} pp)` : ''}`
      : doc.page_length
      ? `${doc.page_length} pp`
      : null;
  const pageViews =
    doc.page_views && (doc.page_views.count || doc.page_views.last_updated)
      ? `${doc.page_views.count ?? t('fr.doc.na')} (${doc.page_views.last_updated ?? t('fr.doc.updatedUnknown')})`
      : null;
  const boolText = (value: boolean | null | undefined) =>
    value === undefined || value === null ? undefined : value ? t('fr.doc.yes') : t('fr.doc.no');
  const regulationInfo =
    doc.regulation_id_number_info && typeof doc.regulation_id_number_info === 'object'
      ? <CollapsibleJson title={t('fr.doc.regulationIdInfo')} data={doc.regulation_id_number_info} />
      : doc.regulation_id_number_info
      ? String(doc.regulation_id_number_info)
      : undefined;
  const regsGovInfo =
    doc.regulations_dot_gov_info && typeof doc.regulations_dot_gov_info === 'object'
      ? <CollapsibleJson title={t('fr.doc.regsGovJson')} data={doc.regulations_dot_gov_info} />
      : doc.regulations_dot_gov_info;
  const docketsValue =
    Array.isArray(doc.dockets) && doc.dockets.length > 0
      ? <CollapsibleJson title={t('fr.doc.dockets')} data={doc.dockets} />
      : doc.dockets;

  const linkSection = (label: string, url?: string | null, text?: string) =>
    url
      ? {
          label,
          value: (
            <a href={url} target="_blank" rel="noreferrer" className="text-primary underline break-all">
              {text || url}
            </a>
          ),
        }
      : null;

  const linkEntries = [
    linkSection(t('fr.doc.htmlUrl'), doc.html_url, t('fr.doc.viewOnFr')),
    linkSection(t('fr.doc.fullText'), doc.body_html_url || doc.full_text_xml_url, t('fr.doc.fullText')),
    linkSection(t('fr.doc.pdf'), doc.pdf_url, t('fr.doc.pdf')),
    linkSection(t('fr.doc.publicInspectionPdf'), doc.public_inspection_pdf_url, t('fr.doc.publicInspectionPdf')),
    linkSection(t('fr.doc.rawText'), doc.raw_text_url),
    linkSection(t('fr.doc.jsonUrl'), doc.json_url),
    linkSection(t('fr.doc.modsUrl'), doc.mods_url),
    linkSection(t('fr.doc.commentUrl'), doc.comment_url),
    linkSection(t('fr.doc.regsGovUrl'), doc.regulations_dot_gov_url || doc.regulations_dot_gov_info?.regulations_dot_gov_url),
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const metadataSections = [
    { label: t('fr.doc.action'), value: doc.action },
    { label: t('fr.doc.dates'), value: doc.dates },
    { label: t('fr.doc.effectiveOn'), value: doc.effective_on },
    { label: t('fr.doc.commentCloseOn'), value: doc.comments_close_on },
    { label: t('fr.doc.addresses'), value: doc.addresses },
    { label: t('fr.doc.contact'), value: doc.contact },
    { label: t('fr.doc.furtherInfo'), value: doc.further_information },
    { label: t('fr.doc.supplementaryInfo'), value: doc.supplementary_information },
    { label: t('fr.doc.abstract'), value: doc.abstract },
    { label: t('fr.doc.topics'), value: topics },
    { label: t('fr.doc.docketIds'), value: docketInfo },
    { label: t('fr.doc.dockets'), value: docketsValue },
    { label: t('fr.doc.regIdNumbers'), value: formatList(doc.regulation_id_numbers) },
    { label: t('fr.doc.regulationIdInfo'), value: regulationInfo },
    { label: t('fr.doc.cfrReferences'), value: cfrRefs },
    { label: t('fr.doc.citation'), value: doc.citation },
    { label: t('fr.doc.correctionOf'), value: doc.correction_of && JSON.stringify(doc.correction_of, null, 2) },
    { label: t('fr.doc.corrections'), value: doc.corrections && JSON.stringify(doc.corrections, null, 2) },
    { label: t('fr.doc.pageRange'), value: pageRange },
    { label: t('fr.doc.pageViews'), value: pageViews },
    { label: t('fr.doc.volume'), value: doc.volume },
    { label: t('fr.doc.startPage'), value: doc.start_page },
    { label: t('fr.doc.endPage'), value: doc.end_page },
    { label: t('fr.doc.presidentialDocNumber'), value: doc.presidential_document_number },
    { label: t('fr.doc.proclamationNumber'), value: doc.proclamation_number },
    { label: t('fr.doc.signingDate'), value: doc.signing_date },
    { label: t('fr.doc.significant'), value: boolText(doc.significant) },
    { label: t('fr.doc.subtype'), value: doc.subtype },
    { label: t('fr.doc.tocDoc'), value: doc.toc_doc },
    { label: t('fr.doc.tocSubject'), value: doc.toc_subject },
    { label: t('fr.doc.topicsRaw'), value: doc.topics && JSON.stringify(doc.topics, null, 2) },
    { label: t('fr.doc.agencyNames'), value: agencies },
    { label: t('fr.doc.regsGovInfo'), value: regsGovInfo },
    { label: t('fr.doc.execOrderNotes'), value: doc.executive_order_notes },
    { label: t('fr.doc.execOrderNumber'), value: doc.executive_order_number },
  ];

  return (
    <div className="space-y-3">
      <div>
        <div className="font-semibold text-sm leading-tight text-foreground">{doc.title}</div>
        {meta && <div className="text-[11px] text-muted-foreground mt-0.5">{meta}</div>}
        {agencies && <div className="text-[11px] text-muted-foreground mt-0.5">{agencies}</div>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {metadataSections.map(({ label, value }) => (
          <Section key={label} label={label} value={value} />
        ))}
      </div>
      {linkEntries.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {linkEntries.map(({ label, value }) => (
            <Section key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </div>
  );
};
