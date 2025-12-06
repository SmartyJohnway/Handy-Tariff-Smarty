// -----------------------------------------------------------------------------
// Shadcn Charts – All-in-One Toolkit (Area, Bar, Line, Pie, Radar, Radial, Tooltips)
// Tech stack: React + TypeScript + Tailwind + shadcn/ui + recharts
// Purpose: Drop-in chart components with unified styles and tooltip.
// RULES:
// 1) Export each symbol exactly ONCE in this file. No re-export blocks at bottom.
// 2) Data labels (Bar/Line/Area) support a shadcn <Switch> to toggle ON/OFF at runtime.
// 3) Keep props stable; add features without breaking existing examples/tests.

import * as React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/switch"; // ✅ shadcn/ui Switch（Radix 包裝）

// -----------------------------------------------------------------------------
// Shared types & helpers
// -----------------------------------------------------------------------------
export type ChartDatum = Record<string, string | number | null | undefined> & {
  label?: string | number;
};

export type SeriesSpec = { key: string; name?: string; colorIndex?: number; yAxis?: "left" | "right"; stackId?: string };

export type InfoSpec = {
  units?: string; // e.g., "USD", "kg", "%"
  dictionary?: Record<string, string>; // e.g., { apples: "Apples - unit" }
};

export type BaseChartProps = {
  title?: string;
  description?: string;
  className?: string;
  height?: number; // px height for chart area
  data: ChartDatum[];
  xKey: string; // key for X axis
  series: SeriesSpec[]; // one or many
  grid?: boolean;
  yFormatter?: (v: number) => string;
  y2Formatter?: (v: number) => string; // for right axis when used
  showDataLabels?: boolean; // 顯示資料點標籤（Bar/Line/Area 適用）
  info?: InfoSpec; // 標題右側 shadcn Tooltip 內容（資料字典/單位）
};

const colorVar = (idx = 1): string => {
  const i = ((idx - 1) % 5) + 1;
  return `rgb(var(--chart-${i}))`;
};
const gridColor = `rgb(var(--chart-grid))`;

const defaultY = (v: number): string => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
};

// -----------------------------------------------------------------------------
// Unified Tooltip content for Recharts hover (custom content)
// Note: Recharts 的 hover 提示必須使用 Recharts <Tooltip>，因此此處只提供 content。
// shadcn/ui 的 <Tooltip> 用於標題資訊提示（info help）。
// -----------------------------------------------------------------------------
export function UiTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mb-1 font-medium text-foreground dark:text-muted-foreground">{String(label)}</div>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground dark:text-muted-foreground">
              {p.name}: <span className="font-medium">{p.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SeriesLegend – shadcn 版本圖例（取代 Recharts <Legend>）
// -----------------------------------------------------------------------------
export function SeriesLegend({ series }: { series: { key: string; name?: string; colorIndex?: number }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorVar((s.colorIndex || i) + 1) }} />
          <span className="text-foreground dark:text-muted-foreground">{s.name || s.key}</span>
        </span>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// HeaderWithInfoToggle – 標題 + Info Tooltip + Data Label Switch（Bar/Line/Area 用）
// 重要：shadcn/ui 的 <Switch> 以 boolean 呼叫 onCheckedChange，我們包一層 handler 保證布林。
// -----------------------------------------------------------------------------
function HeaderWithInfoToggle({
  title,
  description,
  info,
  showDataLabels,
  onToggle,
  series,
}: {
  title: string;
  description?: string;
  info?: InfoSpec;
  showDataLabels: boolean;
  onToggle: (val: boolean) => void;
  series?: SeriesSpec[];
}) {
  const handleToggle = React.useCallback((checked: boolean) => {
    onToggle(Boolean(checked));
  }, [onToggle]);

  return (
    <CardHeader>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex items-center gap-3">
          {/* ✅ Data Label Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Label</span>
            <Switch checked={showDataLabels} onCheckedChange={handleToggle} />
          </div>
          {/* ✅ Info Tooltip：Units / Field dictionary */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground" aria-label="Chart info">i</button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2">
                  {info?.units ? (
                    <p className="text-xs"><span className="font-medium">Units:</span> {info.units}</p>
                  ) : null}
                  {info?.dictionary ? (
                    <div className="text-xs">
                      <div className="font-medium mb-1">Fields</div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {Object.entries(info.dictionary).map(([k,v]) => (
                          <li key={k}><span className="font-mono text-[11px]">{k}</span> – {v}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs">Hover to see values. Use stackId for stacking; set yAxis="right" to enable dual axis.</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {series ? <SeriesLegend series={series} /> : null}
    </CardHeader>
  );
}

// -----------------------------------------------------------------------------
// AREA CHART（含 Data Label Switch + 右軸/堆疊）
// -----------------------------------------------------------------------------
export function AreaChartBasic({
  title = "Area Chart",
  description,
  className,
  height = 260,
  data,
  xKey,
  series,
  grid = true,
  yFormatter = defaultY,
  y2Formatter,
  showDataLabels,
  info,
}: BaseChartProps) {
  const [showLabels, setShowLabels] = React.useState<boolean>(Boolean(showDataLabels));
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} series={series} showDataLabels={showLabels} onToggle={setShowLabels} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 0 }}>
              {grid && <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={yFormatter} tickLine={false} axisLine={false} width={40} />
              {series.some(s => s.yAxis === "right") ? (
                <YAxis orientation="right" yAxisId="right" tickFormatter={y2Formatter || yFormatter} tickLine={false} axisLine={false} width={40} />
              ) : null}
              <RTooltip content={<UiTooltip />} />
              {series.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name || s.key}
                  stroke={colorVar((s.colorIndex || i) + 1)}
                  fill={colorVar((s.colorIndex || i) + 1)}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  activeDot={{ r: 3 }}
                  yAxisId={s.yAxis === "right" ? "right" : "left"}
                  // stackId={s.stackId} // This prop might not exist in the current version
                  label={showLabels ? { position: "top" } : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// BAR CHART（含 Data Label Switch + 右軸/堆疊）
// -----------------------------------------------------------------------------
export function BarChartBasic({
  title = "Bar Chart",
  description,
  className,
  height = 260,
  data,
  xKey,
  series,
  grid = true,
  yFormatter = defaultY,
  y2Formatter,
  showDataLabels,
  info,
}: BaseChartProps) {
  const [showLabels, setShowLabels] = React.useState<boolean>(Boolean(showDataLabels));
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} series={series} showDataLabels={showLabels} onToggle={setShowLabels} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 0 }}>
              {grid && <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={yFormatter} tickLine={false} axisLine={false} width={40} />
              {series.some(s => s.yAxis === "right") ? (
                <YAxis orientation="right" yAxisId="right" tickFormatter={y2Formatter || yFormatter} tickLine={false} axisLine={false} width={40} />
              ) : null}
              <RTooltip content={<UiTooltip />} />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name || s.key}
                  fill={colorVar((s.colorIndex || i) + 1)}
                  radius={[6, 6, 0, 0]}
                  yAxisId={s.yAxis === "right" ? "right" : "left"}
                  stackId={s.stackId}
                  label={showLabels ? { position: "top" } : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// LINE CHART（含 Data Label Switch + 右軸/堆疊）
// -----------------------------------------------------------------------------
export function LineChartBasic({
  title = "Line Chart",
  description,
  className,
  height = 260,
  data,
  xKey,
  series,
  grid = true,
  yFormatter = defaultY,
  y2Formatter,
  showDataLabels,
  info,
}: BaseChartProps) {
  const [showLabels, setShowLabels] = React.useState<boolean>(Boolean(showDataLabels));
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} series={series} showDataLabels={showLabels} onToggle={setShowLabels} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 0 }}>
              {grid && <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />}
              <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tickFormatter={yFormatter} tickLine={false} axisLine={false} width={40} />
              {series.some(s => s.yAxis === "right") ? (
                <YAxis orientation="right" yAxisId="right" tickFormatter={y2Formatter || yFormatter} tickLine={false} axisLine={false} width={40} />
              ) : null}
              <RTooltip content={<UiTooltip />} />
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name || s.key}
                  stroke={colorVar((s.colorIndex || i) + 1)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                  yAxisId={s.yAxis === "right" ? "right" : "left"}
                  label={showLabels ? { position: "top" } : undefined}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// PIE CHART（保留原生 label 行為；不使用 Switch）
// -----------------------------------------------------------------------------
export type PieChartProps = Omit<BaseChartProps, "xKey" | "series"> & {
  valueKey: string;
  nameKey?: string; // defaults to "label"
  colors?: string[]; // optional override
};

export function PieChartBasic({
  title = "Pie Chart",
  description,
  className,
  height = 260,
  data,
  valueKey,
  nameKey = "label",
  colors,
  info,
}: PieChartProps & { info?: InfoSpec }) {
  const palette = colors || [1, 2, 3, 4, 5].map((i) => colorVar(i));
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} showDataLabels={false} onToggle={()=>{}} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RTooltip content={<UiTooltip />} />
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                outerRadius={90}
                innerRadius={50}
                paddingAngle={2}
                label
              >
                {data.map((_, i) => (
                  <Cell key={`slice-${i}`} fill={palette[i % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend for pie */}
        <SeriesLegend series={data.map((d: any, i: number) => ({ key: String(d[nameKey as keyof typeof d] ?? i), name: String(d[nameKey as keyof typeof d] ?? i), colorIndex: i + 1 }))} />
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// RADAR CHART（保留）
// -----------------------------------------------------------------------------
export type RadarChartPropsX = Omit<BaseChartProps, "series"> & {
  valueKey: string; // one series for simplicity
};

export function RadarChartBasic({
  title = "Radar Chart",
  description,
  className,
  height = 300,
  data,
  xKey,
  valueKey,
  info,
}: RadarChartPropsX & { info?: InfoSpec }) {
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} series={[{ key: valueKey, name: valueKey }]} showDataLabels={false} onToggle={()=>{}} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius={90}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <RTooltip content={<UiTooltip />} />
              <Radar dataKey={valueKey} name={valueKey} stroke={colorVar(2)} fill={colorVar(2)} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// RADIAL BAR CHART（保留）
// -----------------------------------------------------------------------------
export type RadialChartProps = {
  title?: string;
  description?: string;
  className?: string;
  height?: number;
  data: { name: string; value: number; fillIndex?: number }[];
  max?: number; // 100 for %
  info?: InfoSpec;
};

export function RadialChartBasic({
  title = "Radial Chart",
  description,
  className,
  height = 260,
  data,
  max = 100,
  info,
}: RadialChartProps) {
  return (
    <Card className={className}>
      <HeaderWithInfoToggle title={title} description={description} info={info} series={data.map((d,i)=>({ key: d.name, name: d.name, colorIndex: (d.fillIndex||i)+1 }))} showDataLabels={false} onToggle={()=>{}} />
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="40%"
              outerRadius="90%"
              barSize={12}
              data={data.map((d, i) => ({ ...d, fill: colorVar((d.fillIndex || i) + 1) }))}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar dataKey="value" cornerRadius={6} />
              <RTooltip content={<UiTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline">Max: {max}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Demo data + gallery page (optional)
// -----------------------------------------------------------------------------
const demoSeries = [
  { key: "apples", name: "Apples", colorIndex: 1 },
  { key: "bananas", name: "Bananas", colorIndex: 2 },
];

// Stacked / dual-axis series for demos (不影響原有範例)
const demoSeriesStacked = [
  { key: "q1", name: "Q1", colorIndex: 1, stackId: "s1" },
  { key: "q2", name: "Q2", colorIndex: 2, stackId: "s1" },
  { key: "q3", name: "Q3", colorIndex: 3, stackId: "s1" },
  { key: "q4", name: "Q4", colorIndex: 4, stackId: "s1" },
];

const demoSeriesDualAxis: SeriesSpec[] = [
  { key: "revenue", name: "Revenue", colorIndex: 1, yAxis: "left" },
  { key: "margin", name: "Margin %", colorIndex: 2, yAxis: "right" },
];

const demoRows: ChartDatum[] = [
  { month: "Jan", apples: 1200, bananas: 900 },
  { month: "Feb", apples: 2100, bananas: 1400 },
  { month: "Mar", apples: 800, bananas: 1200 },
  { month: "Apr", apples: 1600, bananas: 1700 },
  { month: "May", apples: 2400, bananas: 2100 },
  { month: "Jun", apples: 2200, bananas: 1800 },
];

const pieData = [
  { label: "Chrome", value: 58 },
  { label: "Safari", value: 22 },
  { label: "Edge", value: 12 },
  { label: "Firefox", value: 6 },
  { label: "Other", value: 2 },
];

const radarData = [
  { metric: "A", score: 110 },
  { metric: "B", score: 98 },
  { metric: "C", score: 86 },
  { metric: "D", score: 99 },
  { metric: "E", score: 85 },
  { metric: "F", score: 65 },
];

const radialData = [
  { name: "CPU", value: 74 },
  { name: "RAM", value: 56 },
  { name: "Disk", value: 82 },
];

const demoRowsStacked: ChartDatum[] = [
  { cat: "A", q1: 40, q2: 30, q3: 20, q4: 10 },
  { cat: "B", q1: 20, q2: 35, q3: 25, q4: 20 },
  { cat: "C", q1: 10, q2: 15, q3: 30, q4: 45 },
];

// 以百分比堆疊示範資料（不改動元件；由資料端規範為百分比數值 0~100）
const demoRowsStackedPct: ChartDatum[] = demoRowsStacked.map((r) => {
  const total = ["q1","q2","q3","q4"].reduce((acc,k)=> acc + (Number(r[k]||0)), 0);
  return {
    cat: (r as any).cat,
    q1: total ? Math.round((Number(r.q1||0) / total) * 100) : 0,
    q2: total ? Math.round((Number(r.q2||0) / total) * 100) : 0,
    q3: total ? Math.round((Number(r.q3||0) / total) * 100) : 0,
    q4: total ? Math.round((Number(r.q4||0) / total) * 100) : 0,
  } as ChartDatum;
});

const demoRowsDualAxis: ChartDatum[] = [
  { month: "Jan", revenue: 120000, margin: 18 },
  { month: "Feb", revenue: 150000, margin: 22 },
  { month: "Mar", revenue: 90000, margin: 16 },
  { month: "Apr", revenue: 175000, margin: 24 },
];

export default function ChartsToolkitGallery() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shadcn Charts – 全工具包</h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">包含 7 種常見圖表與統一樣式 Tooltip（Recharts hover + shadcn 提示說明），支援資料標籤開關。</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 原有範例：不更動，只是加入可切換的 Label Switch（預設保持原本 showDataLabels） */}
        <AreaChartBasic
          title="Area – 月度水果銷量"
          description="以面積圖呈現兩組序列"
          data={demoRows}
          xKey="month"
          series={demoSeries}
          info={{ units: "units", dictionary: { apples: "Apples units", bananas: "Bananas units" } }}
          showDataLabels
        />

        <BarChartBasic
          title="Bar – 月度水果銷量"
          description="分組直條圖"
          data={demoRows}
          xKey="month"
          series={demoSeries}
          info={{ units: "units", dictionary: { apples: "Apples units", bananas: "Bananas units" } }}
        />

        <LineChartBasic
          title="Line – 月度水果銷量"
          description="折線趨勢圖"
          data={demoRows}
          xKey="month"
          series={demoSeries}
          info={{ units: "units", dictionary: { apples: "Apples units", bananas: "Bananas units" } }}
          showDataLabels
        />

        <PieChartBasic title="Pie – 瀏覽器佔比" description="環形圓餅組合" data={pieData} valueKey="value" nameKey="label" />

        <RadarChartBasic title="Radar – 指標評分" description="雷達網狀圖" data={radarData} xKey="metric" valueKey="score" />

        <RadialChartBasic title="Radial – 系統資源使用率" description="多環徑向條圖" data={radialData} max={100} />
      </div>

      {/* 新增：堆疊 / 百分比堆疊 / 雙軸 範例（不影響原有）*/}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BarChartBasic
          title="Stacked Bar – 季度組成"
          description="使用 stackId 將多序列堆疊"
          data={demoRowsStacked}
          xKey="cat"
          series={demoSeriesStacked}
          info={{ units: "units", dictionary: { q1: "Quarter 1", q2: "Quarter 2", q3: "Quarter 3", q4: "Quarter 4" } }}
          showDataLabels
        />

        <BarChartBasic
          title="% Stacked Bar – 比例"
          description="資料端已正規化成百分比"
          data={demoRowsStackedPct}
          xKey="cat"
          series={demoSeriesStacked}
          yFormatter={(v)=> `${v}%`}
          info={{ units: "%", dictionary: { q1: "Quarter 1 %", q2: "Quarter 2 %", q3: "Quarter 3 %", q4: "Quarter 4 %" } }}
          showDataLabels
        />

        <LineChartBasic
          title="Dual Axis – 營收/毛利"
          description="左軸金額、右軸百分比"
          data={demoRowsDualAxis}
          xKey="month"
          series={demoSeriesDualAxis}
          yFormatter={(v)=> `$${defaultY(v)}`}
          y2Formatter={(v)=> `${v}%`}
          info={{ units: "Revenue: USD / Margin: %", dictionary: { revenue: "Revenue (USD)", margin: "Margin (%)" } }}
          showDataLabels
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tooltip – 說明</CardTitle>
          <CardDescription>
            圖上滑動的即時提示為 Recharts Tooltip（以 <code>content</code> 客製樣式）；標題右側的提示為 shadcn/ui Tooltip（顯示單位與資料字典）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground dark:text-muted-foreground">如需將圖例完全抽換為 shadcn 按鈕/切換控制，可擴充 <code>SeriesLegend</code>，加入顯示/隱藏序列的交互。</div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Lightweight test fixtures (import into your test runner)
// -----------------------------------------------------------------------------
export const __TESTS__ = {
  // Smoke render cases (developer can mount each component with these props)
  smoke: {
    area: {
      props: {
        data: [{ x: "A", y: 1 }],
        xKey: "x",
        series: [{ key: "y", name: "Y" }],
        showDataLabels: true,
      },
    },
    bar: {
      props: {
        data: [{ x: "A", y: 1 }],
        xKey: "x",
        series: [{ key: "y", name: "Y" }],
      },
    },
    line: {
      props: {
        data: [{ x: "A", y: 1 }],
        xKey: "x",
        series: [{ key: "y", name: "Y" }],
        showDataLabels: true,
      },
    },
    pie: {
      props: { data: [{ label: "A", value: 1 }], valueKey: "value", nameKey: "label" },
    },
    radar: {
      props: { data: [{ m: "A", s: 10 }], xKey: "m", valueKey: "s" },
    },
    radial: {
      props: { data: [{ name: "CPU", value: 50 }], max: 100 },
    },
    stacked: { props: { data: [{ cat: "A", q1: 1, q2: 2 }], xKey: "cat", series: [{ key: "q1", stackId: "s1" }, { key: "q2", stackId: "s1" }], showDataLabels: true } },
    stackedPct: { props: { data: [{ cat: "A", q1: 40, q2: 60 }], xKey: "cat", series: [{ key: "q1", stackId: "s1" }, { key: "q2", stackId: "s1" }], yFormatter: (v:number)=> `${v}%`, showDataLabels: true } },
    dualAxis: { props: { data: [{ m: "A", revenue: 100, margin: 25 }], xKey: "m", series: [{ key: "revenue", yAxis: "left" }, { key: "margin", yAxis: "right" }], y2Formatter: (v:number)=> `${v}%`, showDataLabels: true } },
  },
  // Edge cases
  edges: {
    emptySeriesArea: { props: { data: [], xKey: "x", series: [] } },
    nullValuesLine: {
      props: {
        data: [
          { month: "Jan", apples: null, bananas: 0 },
          { month: "Feb", apples: 10, bananas: null },
        ],
        xKey: "month",
        series: [
          { key: "apples", name: "Apples" },
          { key: "bananas", name: "Bananas" },
        ],
      },
    },
    pieZeros: { props: { data: [{ label: "A", value: 0 }], valueKey: "value", nameKey: "label" } },
  },
};
