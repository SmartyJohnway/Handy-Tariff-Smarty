import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Props = {
  manualText?: string;
};

const ZhContent = () => {
  const { t } = useTranslation();
  const defItems = t('fr.publicInspection.zh.defItems', { returnObjects: true }) as string[];
  const scopeItems = t('fr.publicInspection.zh.scopeItems', { returnObjects: true }) as string[];
  const flowItems = t('fr.publicInspection.zh.flowItems', { returnObjects: true }) as string[];

  return (
    <div lang="zh-Hant" className="space-y-3 text-sm leading-6">
      <section className="space-y-1.5">
        <h4 className="font-semibold text-foreground">{t('fr.publicInspection.zh.defTitle')}</h4>
        <ul className="list-disc list-outside pl-5 space-y-1 text-muted-foreground">
          {defItems.map((it, idx) => <li key={`def-${idx}`}>{it}</li>)}
        </ul>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-foreground">{t('fr.publicInspection.zh.scopeTitle')}</h4>
        <p className="text-muted-foreground">{t('fr.publicInspection.zh.scopeIntro')}</p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-muted-foreground">
          {scopeItems.map((it, idx) => <li key={`scope-${idx}`}>{it}</li>)}
        </ul>
        <p className="text-muted-foreground">{t('fr.publicInspection.zh.scopeNote')}</p>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-semibold text-foreground">{t('fr.publicInspection.zh.flowTitle')}</h4>
        <p className="text-muted-foreground">{t('fr.publicInspection.zh.flowIntro')}</p>
        <ul className="list-disc list-outside pl-5 space-y-1 text-muted-foreground">
          {flowItems.map((it, idx) => <li key={`flow-${idx}`}>{it}</li>)}
        </ul>
      </section>

      <div className="pt-2">
        <p className="font-semibold text-foreground">{t('fr.publicInspection.zh.summaryTitle')}</p>
        <p className="text-muted-foreground">{t('fr.publicInspection.zh.summary')}</p>
      </div>
    </div>
  );
};

const EnContent = () => {
  const { t } = useTranslation();
  const paras = t('fr.publicInspection.en.paragraphs', { returnObjects: true }) as string[];
  const warn1 = t('fr.publicInspection.en.warning1');
  const warn2 = t('fr.publicInspection.en.warning2');

  return (
    <div lang="en" className="space-y-3 text-sm leading-6">
      {paras.map((p, idx) => (
        <p key={`p-${idx}`} className="text-muted-foreground">
          {idx === 3 ? (
            <>
              {p} <a href="#" className="text-primary hover:underline">{t('fr.publicInspection.en.aboutLink')}</a>.
            </>
          ) : p}
        </p>
      ))}

      <div className="my-2 p-3 bg-warning/10 border-l-4 border-warning text-foreground rounded-r-lg">
        <p>{warn1}</p>
      </div>

      <div className="my-2 p-3 bg-info/10 border-l-4 border-info text-foreground rounded-r-lg">
        <p>{warn2}</p>
      </div>
    </div>
  );
};

export default function PublicInspectionInfoCard({ manualText }: Props) {
  const { t, i18n } = useTranslation();
  const lang: "zh" | "en" = i18n.language?.startsWith("zh") ? "zh" : "en";
  const title = useMemo(() => (lang === "zh" ? t('fr.publicInspection.titleZh') : t('fr.publicInspection.titleEn')), [lang, t]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 md:p-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">{title}</CardTitle>
          <div className="inline-flex gap-1">
            <Button
              size="sm"
              variant={lang === "zh" ? "secondary" : "ghost"}
              className="h-8"
              aria-pressed={lang === "zh"}
              onClick={() => i18n.changeLanguage("zh-TW")}
            >
              {t('fr.publicInspection.switchZh')}
            </Button>
            <Button
              size="sm"
              variant={lang === "en" ? "secondary" : "ghost"}
              className="h-8"
              aria-pressed={lang === "en"}
              onClick={() => i18n.changeLanguage("en")}
            >
              {t('fr.publicInspection.switchEn')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4">
        <div className="min-h-[300px]">
          {manualText ? (
            <div className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{manualText}</div>
          ) : lang === "zh" ? (
            <ZhContent />
          ) : (
            <EnContent />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
