import React, { useMemo, useState } from 'react';
import { Folder, FileJson, ChevronDown, ChevronRight } from 'lucide-react';
import type { InvestigationItem } from '@/types/usitc-schema';

type RawItem = InvestigationItem | Record<string, any>;

interface SchemaNodeProps {
  label: string;
  type: string;
  value?: string | number | boolean | null;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const SchemaNode: React.FC<SchemaNodeProps> = ({ label, type, value, children, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const hasChildren = !!children;
  return (
    <div className="ml-4 border-l border-slate-200 pl-3 py-1">
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-700">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-slate-700 font-mono text-sm">{label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500">{type}</span>
        {value !== undefined && value !== null && (
          <span className="text-xs text-slate-500 truncate max-w-xs">= {String(value)}</span>
        )}
      </div>
      {hasChildren && open && <div className="mt-1">{children}</div>}
    </div>
  );
};

const renderNode = (data: any, label: string, depth = 0): React.ReactNode => {
  if (data === null || data === undefined) {
    return <SchemaNode label={label} type="null" value={null} />;
  }
  if (typeof data !== 'object') {
    return <SchemaNode label={label} type={typeof data} value={data as any} />;
  }
  if (Array.isArray(data)) {
    return (
      <SchemaNode label={label} type="array" defaultOpen={depth === 0}>
        {data.map((item, idx) => (
          <div key={idx} className="mb-1">
            {renderNode(item, `[${idx}]`, depth + 1)}
          </div>
        ))}
      </SchemaNode>
    );
  }
  return (
    <SchemaNode label={label} type="object" defaultOpen={depth === 0}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="mb-1">
          {renderNode(v, k, depth + 1)}
        </div>
      ))}
    </SchemaNode>
  );
};

const CaseDashboardRawMapfordev = ({ raw }: { raw?: RawItem }) => {
  const tree = useMemo(() => renderNode(raw ?? {}, '{Investigation Item}'), [raw]);

  return (
    <div className="border rounded-2xl p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Folder className="text-indigo-500" size={18} />
        <h3 className="font-semibold text-slate-800 text-sm">Raw JSON Tree (Dev)</h3>
      </div>
      <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
        <FileJson size={14} />
        直接顯示 API 回傳的階層資料，便於開發者檢視欄位。
      </div>
      <div className="max-h-[480px] overflow-auto pr-2">{tree}</div>
    </div>
  );
};

export default CaseDashboardRawMapfordev;
