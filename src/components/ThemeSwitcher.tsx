import * as React from "react";
import { Palette, Languages, SunMedium, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { value: "default", label: "Default" },
  { value: "ocean", label: "Ocean" },
  { value: "jade", label: "Jade" },
  { value: "plum", label: "Plum" },
];

const LANGS = [
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
];

export function ThemeSwitcher({
  theme,
  setTheme,
  themeName,
  setThemeName,
}: {
  theme: string;
  setTheme: (theme: string) => void;
  themeName: string;
  setThemeName: (name: string) => void;
}) {
  const { i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language || "zh-TW";

  const handleLangChange = (lng: string) => {
    void i18n.changeLanguage(lng);
    try {
      window.localStorage.setItem("lng", lng);
    } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-border/60 p-0"
          title="外觀 / 語言"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <SunMedium className="h-3.5 w-3.5" />
          模式
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">亮色</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">暗色</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">系統</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Moon className="h-3.5 w-3.5" />
          主題
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={themeName} onValueChange={setThemeName}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.value} value={t.value}>
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          語言
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentLang} onValueChange={handleLangChange}>
          {LANGS.map((l) => (
            <DropdownMenuRadioItem key={l.value} value={l.value}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
