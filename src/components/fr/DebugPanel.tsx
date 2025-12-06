import React from 'react';
import { useTranslation } from "react-i18next";
import { CollapsibleJson } from "@/components/ui/CollapsibleJson";

export function DebugPanel(props: {
  debugMode: boolean;
  payload?: any;
  debugInfo?: any;
  appliedConditions: any;
}) {
  const { debugMode, payload, debugInfo, appliedConditions } = props;
  const { t } = useTranslation();
  if (!debugMode) return null;
  return (
    <>
      {payload && (<CollapsibleJson title={t('fr.debug.searchResponse')} data={payload} />)}
      {debugInfo && (
        <div className="mt-2 p-0">
          <div className="text-sm font-semibold mb-1">{t('fr.debug.upstream')}</div>
          {debugInfo.documents_url && (
            <div className="text-xs truncate"><a className="text-primary hover:underline" href={debugInfo.documents_url} target="_blank" rel="noreferrer">documents_url</a></div>
          )}
          {debugInfo.facet_urls && typeof debugInfo.facet_urls === "object" && (
            <div className="mt-1 space-y-0.5">
              {Object.entries(debugInfo.facet_urls).map(([k, v]: any) => (
                <div key={k} className="text-xs truncate"><span className="font-medium mr-1">{k}:</span><a className="text-primary hover:underline" href={String(v)} target="_blank" rel="noreferrer">{String(v)}</a></div>
              ))}
            </div>
          )}
          {debugInfo.effective_query && (
            <div className="mt-2"><CollapsibleJson title={t('fr.debug.effectiveQuery')} data={debugInfo.effective_query} /></div>
          )}
          {debugInfo.received && (
            <div className="mt-2 space-y-2">
              {debugInfo.received.raw_querystring && (
                <div className="text-xs break-all"><span className="font-medium mr-1">raw_querystring:</span>{String(debugInfo.received.raw_querystring)}</div>
              )}
              {debugInfo.received.nested && (
                <CollapsibleJson title={t('fr.debug.receivedNested')} data={debugInfo.received.nested} />
              )}
              {debugInfo.received.simple && (
                <CollapsibleJson title={t('fr.debug.receivedSimple')} data={debugInfo.received.simple} />
              )}
            </div>
          )}
          <div className="mt-2">
            <CollapsibleJson title={t('fr.debug.appliedConditions')} data={appliedConditions} />
          </div>
        </div>
      )}
    </>
  );
}
