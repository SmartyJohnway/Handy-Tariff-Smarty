import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Factory,
  FileText,
  Gavel,
  Info,
  Mail,
  MapPin,
  Phone,
  Scale,
  User,
  Users,
  Globe,
  BookOpen,
  ListTree,
} from 'lucide-react';
import type { InvestigationItem } from '@/types/usitc-schema';
import { useTranslation } from 'react-i18next';

type RawItem = InvestigationItem | Record<string, any>;

const parseDate = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === 'object' && 'date' in val) {
    if ((val as any).isNa) return null;
    return String((val as any).date).split('T')[0];
  }
  if (typeof val === 'string' && val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[0]}-${parts[1]}`;
    }
  }
  return String(val);
};

const pick = (obj: any, keys: string[]): any =>
  keys.reduce((val, key) => (val !== undefined ? val : obj?.[key]), undefined);

const buildIdsLink = (caseId: any, invId: any): string | null => {
  if (caseId === undefined || caseId === null) return null;
  if (invId === undefined || invId === null) return null;
  return `https://ids.usitc.gov/case/${caseId}/investigation/${invId}`;
};

const useInvestigationViewModel = (raw?: RawItem) => {
  return useMemo(() => {
    const r: any = raw ?? {};
    const rootCaseId = pick(r, ['Case ID', 'case_id']);
    const rootInvId = pick(r, ['Investigation ID', 'investigation_id']);
    const productGroup = pick(r, ['Product Group Code']);
    const phaseNumber =
      pick(r, ['Phase Number'])?.Name ||
      pick(r, ['Phase Number'])?.name ||
      pick(r, ['Phase Number']);

    const baseInfo = {
      id: pick(r, ['Investigation ID', 'investigation_id']),
      displayNumber:
        pick(r, ['official_investigation_number', 'Investigation Number']) || '',
      title: pick(r, ['Full Title', 'investigation_title', 'Topic']) || '',
      product: pick(r, ['Topic', 'product_name', 'short_product_name']) || '',
      status:
        pick(r, ['Investigation Status', 'investigation_status_name'])?.Name ||
        pick(r, ['Investigation Status', 'investigation_status_name'])?.name ||
        pick(r, ['Investigation Status', 'investigation_status_name']) ||
        '',
      isActive: pick(r, ['Is Active?', 'is_active']) ?? false,
      type:
        pick(r, ['Investigation Type', 'investigation_type_name'])?.Name ||
        pick(r, ['Investigation Type', 'investigation_type_name'])?.name ||
        pick(r, ['Investigation Type', 'investigation_type_name']) ||
        '',
      phase:
        pick(r, ['Investigation Phase', 'phase_long_title', 'phase_title'])?.Name ||
        pick(r, ['Investigation Phase', 'phase_long_title', 'phase_title'])?.name ||
        pick(r, ['Investigation Phase', 'phase_long_title', 'phase_title']) ||
        '',
      idsLink: buildIdsLink(rootCaseId, rootInvId),
      productGroup,
      phaseNumber,
    };

    const countries =
      pick(r, ['Countries', 'countries'])?.map((c: any) => c.name || c['Country Name'] || c.country_name) || [];

    const categories =
      pick(r, ['Investigation Categories'])?.map((c: any) => c.Name || c.name) || [];
    const categoriesDetailed =
      pick(r, ['Investigation Categories'])?.map((c: any) => ({
        id: c.ID ?? c.id,
        name: c.Name || c.name,
        active: c['Is Active?'],
      })) || [];

    const mgr = pick(r, ['Case Manager']);
    const manager = mgr
      ? {
          name: `${mgr['Staff First Name'] || ''} ${mgr['Staff Last Name'] || ''}`.trim() || mgr.Name,
          email: mgr.Email,
          phone: mgr['Phone Number'],
          title: mgr['Staff Title'],
        }
      : null;

    const timeline = [
      {
        key: 'frNotice',
        defaultLabel: 'FR Notice',
        date: parseDate(pick(r, ['Date of Publication of FR Notice (NOI)'])),
        type: 'doc',
      },
      {
        key: 'commerceInit',
        defaultLabel: 'Commerce Initiation',
        date: parseDate(pick(r, ['Commerce Initiation Date'])),
        type: 'milestone',
      },
      {
        key: 'vote',
        defaultLabel: 'Vote',
        date: parseDate(pick(r, ['Vote Date'])),
        type: 'vote',
      },
    ]
      .filter((e) => e.date)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());

    const extraDates = [
      { key: 'startDate', label: 'Start Date', value: pick(r, ['Start Date']) },
      { key: 'investigationEnd', label: 'Investigation End Date', value: pick(r, ['Investigation End Date']) },
      { key: 'termination', label: 'Investigation Termination Date', value: pick(r, ['Investigation Termination Date']) },
      { key: 'finalDetermination', label: 'Final Determination Date', value: pick(r, ['Final Determination Date']) },
      { key: 'determination', label: 'Determination Date', value: pick(r, ['Determination Date']) },
      { key: 'initiatingDoc', label: 'Initiating Document Received Date', value: pick(r, ['Initiating Document Received Date']) },
      { key: 'responsesDue', label: 'Responses to Notice of Institution Due Date', value: pick(r, ['Responses to Notice of Institution Due Date']) },
    ]
      .map(({ key, label, value }) => ({ key, label, date: parseDate(value) }))
      .filter((d) => d.date);

    const orders =
      pick(r, ['Commerce Orders'])?.map((o: any) => {
        const orderCaseId = pick(o, ['Case ID']) ?? rootCaseId;
        const orderInvId =
          pick(o, ['Investigation ID']) ??
          pick(o, ['Sub-Investigation', 'Investigation ID']) ??
          rootInvId;
        return {
          number: o['Commerce Order/Case Number'],
          date: parseDate(o['Order Issuance/Suspension Agreement Date']),
          desc: 'Commerce Order',
          idsLink: buildIdsLink(orderCaseId, orderInvId),
          sub: pick(o, ['Sub-Investigation']),
        };
      }) || [];

    const staff =
      pick(r, ['Staff', 'case_officers'])?.map((s: any) => ({
        name: s['Staff Name']?.Name || s.Name || `${s.staff_first_name || ''} ${s.staff_last_name || ''}`.trim(),
        role: s['Staff Assigned Type']?.Name || s.staff_role_name,
        active: s['Is Active?'],
      })) || [];

    const participants =
      pick(r, ['Participants'])?.map((p: any) => ({
        name: p.Participant?.Name,
        country: p.Participant?.Country?.name,
        type: p['Participant Type']?.Name,
        isPetitioner: p['Is Petitioner?'],
      })) || [];

    const hts =
      pick(r, ['HTS Number'])?.map((h: any) => ({
        active: h.Active,
        code: h['HTS Number & Description']?.Name,
        desc: h['HTS Number & Description']?.Description,
      })) || [];

    const ip =
      pick(r, ['Intellectual Property'])?.map((i: any) => ({
        activeDate: parseDate(i['Active Date']),
        expiration: parseDate(i['Intellectual Property ID']?.['IP Expiration Date']),
        type: i['Intellectual Property ID']?.Type?.Name,
      })) || [];

    const unfairActs =
      pick(r, ['Unfair Act'])?.map((u: any) => u['Unfair Act in Notice']?.name || u.name) || [];

    const subInvestigations =
      pick(r, ['Sub-investigation'])?.map((sub: any) => ({
        number: sub['Investigation Number'],
        country: sub.Country?.name,
        votes: sub.Votes || [],
      })) || [];

    const documents =
      pick(r, ['Investigation Documents'])?.map((d: any) => ({
        title: d['Document Title'],
        link: d['Document Link'],
        type: d['Document Type']?.['Investigation Document Name'],
      })) || [];

    const frNotices = [
      {
        label: 'F.R. Citation for Notice of Institution',
        citation: pick(r, ['F.R. Citation for Notice of Institution']),
        date: parseDate(pick(r, ['Date of Publication of FR Notice (NOI)'])),
      },
    ].filter((f) => f.citation || f.date);

    return {
      ...baseInfo,
      countries,
      categories,
      categoriesDetailed,
      manager,
      timeline,
      extraDates,
      orders,
      staff,
      participants,
      hts,
      ip,
      unfairActs,
      subInvestigations,
      documents,
      frNotices,
    };
  }, [raw]);
};

const StatusBadge = ({ status, active }: { status: string; active: boolean }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const completedLabel = tAny('caseDashboard.completed', { defaultValue: 'Completed' });
  const activeLabel = tAny('caseDashboard.active', { defaultValue: 'Active' });
  const inactiveLabel = tAny('caseDashboard.inactive', { defaultValue: 'Inactive' });
  const naLabel = tAny('caseDashboard.na', { defaultValue: 'N/A' });

  const isCompleted = status?.toLowerCase() === 'completed' || status === completedLabel;
  const colorClass = active
    ? 'bg-success/20 text-success border-success/30'
    : isCompleted
    ? 'bg-muted text-muted-foreground border-border'
    : 'bg-warning/20 text-warning border-warning/30';
  const Icon = active ? Clock : isCompleted ? CheckCircle2 : Gavel;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
      <Icon size={14} />
      {status || naLabel} {active ? `(${activeLabel})` : `(${inactiveLabel})`}
    </span>
  );
};

const InfoCard = ({ icon: Icon, label, value, subValue }: any) => (
  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border shadow-sm">
    <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-foreground font-medium">{value || 'N/A'}</p>
      {subValue && <p className="text-sm text-muted-foreground mt-1">{subValue}</p>}
    </div>
  </div>
);

const TimelineEvent = ({ item, isLast }: { item: any; isLast: boolean }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <CheckCircle2 size={16} className="text-white" />;
      case 'vote':
        return <Gavel size={16} className="text-white" />;
      case 'meeting':
        return <Users size={16} className="text-white" />;
      default:
        return <FileText size={16} className="text-white" />;
    }
  };
  const getBgColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-primary';
      case 'vote':
        return 'bg-warning';
      default:
        return 'bg-muted-foreground';
    }
  };
  return (
    <div className="relative pl-8 pb-8 group">
      {!isLast && <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border group-hover:bg-primary/40 transition-colors" />}
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-primary/10 ${getBgColor(item.type)}`}>
        {getIcon(item.type)}
      </div>
      <div className="bg-muted/30 p-4 rounded-lg border border-border shadow-sm group-hover:border-primary/40 transition-colors relative -top-2">
        <div className="flex justify-between items-start mb-1">
          <span className="text-sm font-bold text-foreground">{item.label || item.event || item.defaultLabel || item.key}</span>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{item.date}</span>
        </div>
        {item.detail && (
          <p className="text-sm text-foreground mt-2 bg-muted/40 p-2 rounded border border-border flex items-start gap-2">
            <Info size={14} className="mt-0.5 text-primary shrink-0" />
            {item.detail}
          </p>
        )}
      </div>
    </div>
  );
};

const Accordion: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  children,
  defaultOpen,
}) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  return (
    <div className="rounded-xl border border-border bg-muted/20 shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground text-xs">
          {open
            ? tAny('caseDashboard.collapse', { defaultValue: 'Collapse' })
            : tAny('caseDashboard.expand', { defaultValue: 'Expand' })}
        </span>
      </button>
      {open && <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/10">{children}</div>}
    </div>
  );
};
const CaseDashboardRawMapforuser = ({ raw }: { raw?: RawItem }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const naLabel = tAny('caseDashboard.na', { defaultValue: 'N/A' });
  const inactiveLabel = tAny('caseDashboard.inactive', { defaultValue: 'Inactive' });
  const petitionerLabel = tAny('caseDashboard.petitioner', { defaultValue: 'Petitioner' });
  const commerceOrderLabel = tAny('caseDashboard.commerceOrder', { defaultValue: 'Commerce Order' });
  const translateTimeline = (item: any) =>
    tAny(`caseDashboard.timeline.${item.key}`, { defaultValue: item.defaultLabel || item.key });
  const translateExtraDate = (item: any) =>
    tAny(`caseDashboard.extra.${item.key}`, { defaultValue: item.label || item.key });
  const data = useInvestigationViewModel(raw);

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-border p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded border border-border">
              {data.type || tAny('caseDashboard.typeNA', { defaultValue: 'Type N/A' })}
            </span>
            <span className="text-sm font-mono text-muted-foreground">#{data.displayNumber || 'N/A'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold leading-tight text-foreground">{data.title || 'No Title'}</h1>
          {data.phaseNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              {tAny('caseDashboard.phaseNumber', { defaultValue: 'Phase Number' })}: {data.phaseNumber}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right space-y-1">
          <StatusBadge status={data.status} active={!!data.isActive} />
          {data.idsLink && (
            <div>
              <a href={data.idsLink} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                {tAny('caseDashboard.viewOnIds', { defaultValue: 'View on IDS' })}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InfoCard icon={MapPin} label={tAny('caseDashboard.cards.countries', { defaultValue: 'Countries' })} value={data.countries.join(', ') || naLabel} />
        <InfoCard icon={Scale} label={tAny('caseDashboard.cards.categories', { defaultValue: 'Investigation Categories' })} value={data.categories.join(' & ') || naLabel} />
        <InfoCard icon={Factory} label={tAny('caseDashboard.cards.product', { defaultValue: 'Product' })} value={data.product || naLabel} />
        <InfoCard icon={Gavel} label={tAny('caseDashboard.cards.phase', { defaultValue: 'Phase' })} value={data.phase || naLabel} />
      </div>

      {/* Accordions */}
      <div className="space-y-3">
        <Accordion title={tAny('caseDashboard.sections.basic', { defaultValue: 'Basic Info / Categories' })} defaultOpen>
          <div className="text-sm text-foreground space-y-2">
            {data.productGroup && (
              <div>
                <div className="font-semibold">{tAny('caseDashboard.productGroup', { defaultValue: 'Product Group Code' })}</div>
                <div className="text-muted-foreground text-sm">
                  {data.productGroup?.Name || naLabel}{' '}
                  {data.productGroup?.['Product Group Code Description'] && (
                    <span className="text-muted-foreground">
                      ({data.productGroup?.['Product Group Code Description']})
                    </span>
                  )}
                </div>
              </div>
            )}
            {data.categoriesDetailed.length > 0 && (
              <div>
                <div className="font-semibold">{tAny('caseDashboard.categories', { defaultValue: 'Investigation Categories' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.categoriesDetailed.map((c: any, idx: number) => (
                    <li key={idx}>
                      {c.name} {c.active === false ? `(${inactiveLabel})` : ''}
                      {c.id ? ` [ID: ${c.id}]` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title={tAny('caseDashboard.sections.timeline', { defaultValue: 'Timeline & Dates' })} defaultOpen>
          <div className="space-y-3">
            {data.timeline.length > 0 ? (
              data.timeline.map((event: any, index: number) => (
                <TimelineEvent
                  key={index}
                  item={{ ...event, label: translateTimeline(event) }}
                  isLast={index === data.timeline.length - 1}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {tAny('caseDashboard.empty.timeline', { defaultValue: 'No timeline events' })}
              </p>
            )}
            {data.extraDates.length > 0 && (
              <div className="rounded-md border border-border p-3 text-sm text-foreground space-y-1 bg-muted/30">
                {data.extraDates.map((d: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">{translateExtraDate(d)}</span>
                    <span className="font-mono text-foreground">{d.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title={tAny('caseDashboard.sections.people', { defaultValue: 'People & Participants' })} defaultOpen={false}>
          <div className="space-y-3 text-sm text-foreground">
            {managerSection(data.manager)}
            {data.staff.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.staff', { defaultValue: 'Staff' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.staff.map((s: any, idx: number) => (
                    <li key={idx}>
                      {s.name || naLabel} {s.role ? `(${s.role})` : ''} {s.active === false ? ` - ${inactiveLabel}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.participants.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.participants', { defaultValue: 'Participants' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.participants.map((p: any, idx: number) => (
                    <li key={idx}>
                      {p.name || naLabel} {p.type ? `(${p.type})` : ''} {p.country ? `- ${p.country}` : ''}{' '}
                      {p.isPetitioner ? `[${petitionerLabel}]` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title={tAny('caseDashboard.sections.scope', { defaultValue: 'Scope & Items (HTS / IP / Unfair Act)' })} defaultOpen={false}>
          <div className="space-y-3 text-sm text-foreground">
            {data.hts.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.hts', { defaultValue: 'HTS Number' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.hts.map((h: any, idx: number) => (
                    <li key={idx}>
                      {h.code || naLabel} - {h.desc || naLabel} {h.active === false ? `(${inactiveLabel})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.ip.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.ip', { defaultValue: 'Intellectual Property' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.ip.map((i: any, idx: number) => (
                    <li key={idx}>
                      {i.type || naLabel} | {tAny('caseDashboard.activeDate', { defaultValue: 'Active' })}: {i.activeDate || naLabel} | {tAny('caseDashboard.expiration', { defaultValue: 'Expiration' })}: {i.expiration || naLabel}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.unfairActs.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.unfairActs', { defaultValue: 'Unfair Acts' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.unfairActs.map((u: any, idx: number) => (
                    <li key={idx}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.hts.length === 0 && data.ip.length === 0 && data.unfairActs.length === 0 && (
              <p className="text-muted-foreground">
                {tAny('caseDashboard.empty.general', { defaultValue: 'No related data' })}
              </p>
            )}
          </div>
        </Accordion>

        <Accordion title={tAny('caseDashboard.sections.orders', { defaultValue: 'Orders / Sub-investigation / Votes' })} defaultOpen={false}>
          <div className="space-y-3 text-sm text-foreground">
            {data.orders.length > 0 ? (
              data.orders.map((order: any, idx: number) => (
                <div key={idx} className="rounded-md border border-border p-3 bg-muted/30">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{order.desc || commerceOrderLabel}</div>
                      <div className="font-mono text-muted-foreground">{order.number || naLabel}</div>
                      {order.idsLink && (
                        <a href={order.idsLink} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                          {tAny('caseDashboard.viewOnIds', { defaultValue: 'View on IDS' })}
                        </a>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{tAny('caseDashboard.date', { defaultValue: 'Date' })}</div>
                      <div className="text-sm text-foreground">{order.date || naLabel}</div>
                    </div>
                  </div>
                  {order.sub && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {tAny('caseDashboard.subInvestigation', { defaultValue: 'Sub-Investigation' })}:{' '}
                      {order.sub['Investigation Number'] || naLabel} {order.sub.Country?.name ? `- ${order.sub.Country?.name}` : ''}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                {tAny('caseDashboard.empty.orders', { defaultValue: 'No orders data' })}
              </p>
            )}

            {data.subInvestigations.length > 0 && (
              <div className="rounded-md border border-border p-3 bg-muted/30">
                <div className="font-semibold mb-2">{tAny('caseDashboard.subInv', { defaultValue: 'Sub-investigation / Votes' })}</div>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  {data.subInvestigations.map((s: any, idx: number) => (
                    <li key={idx}>
                      {s.number || naLabel} {s.country ? `- ${s.country}` : ''}
                      {s.votes && s.votes.length > 0 && (
                        <ul className="list-disc pl-5 mt-1 text-xs">
                          {s.votes.map((v: any, vidx: number) => (
                            <li key={vidx}>
                              {tAny('caseDashboard.voteType', { defaultValue: 'Vote Type' })}: {v['Vote Type']?.Name || naLabel} |{' '}
                              {tAny('caseDashboard.voteDate', { defaultValue: 'Vote Date' })}: {parseDate(v['Vote Date']) || naLabel}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title={tAny('caseDashboard.sections.documents', { defaultValue: 'Documents / Notices' })} defaultOpen={false}>
          <div className="space-y-3 text-sm text-foreground">
            {data.documents.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.documents', { defaultValue: 'Investigation Documents' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.documents.map((d: any, idx: number) => (
                    <li key={idx} className="space-x-1">
                      {d.link ? (
                        <a href={d.link} target="_blank" rel="noreferrer" className="text-primary underline">
                          {d.title || 'Document'}
                        </a>
                      ) : (
                        <span>{d.title || 'Document'}</span>
                      )}
                      {d.type && <span className="text-xs text-slate-500">({d.type})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.frNotices.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{tAny('caseDashboard.frNotices', { defaultValue: 'FR Notices / Citation' })}</div>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {data.frNotices.map((f: any, idx: number) => (
                    <li key={idx}>
                      {f.citation || naLabel} {f.date ? `- ${f.date}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.documents.length === 0 && data.frNotices.length === 0 && (
              <p className="text-muted-foreground">
                {tAny('caseDashboard.empty.documents', { defaultValue: 'No documents/notices' })}
              </p>
            )}
          </div>
        </Accordion>
      </div>
    </div>
  );
};

const managerSection = (mgr: any) => {
  if (!mgr) return null;
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  return (
    <div className="rounded-lg border border-border p-3 bg-muted/40">
      <div className="flex items-center gap-2 text-primary font-semibold">
        <User size={16} /> {tAny('caseDashboard.caseManager', { defaultValue: 'Case Manager' })}
      </div>
      <div className="text-sm text-foreground mt-1">{mgr.name}</div>
      {mgr.title && <div className="text-xs text-muted-foreground">{mgr.title}</div>}
      {mgr.email && (
        <div className="text-xs text-primary mt-1">
          <a href={`mailto:${mgr.email}`} className="underline">
            {mgr.email}
          </a>
        </div>
      )}
      {mgr.phone && <div className="text-xs text-muted-foreground">{mgr.phone}</div>}
    </div>
  );
};

export default CaseDashboardRawMapforuser;
