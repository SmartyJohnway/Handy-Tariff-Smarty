import React from 'react';
import { Button } from '@/components/ui/Button';
import { Star, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { useTranslation } from 'react-i18next';

interface Favorite {
  hts: string;
  addedAt: string;
  note?: string;
  description?: string;
}

interface FavoritesModalProps {
  open: boolean;
  onClose: () => void;
  favorites: Favorite[];
  onSelect: (hts: string) => void;
  onRemove: (hts: string) => void;
  draftFavorite?: { hts: string; description?: string } | null;
  onAddFavorite?: (note: string) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  open,
  onClose,
  favorites,
  onSelect,
  onRemove,
  draftFavorite,
  onAddFavorite,
}) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    setNote('');
  }, [draftFavorite?.hts]);

  const content = favorites.length > 0 ? (
    <div className="space-y-2">
      {favorites.map((f) => (
        <div key={f.hts} className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <button
              type="button"
              className="cursor-pointer font-mono text-sm text-left hover:text-primary"
              onClick={() => { onSelect(f.hts); onClose(); }}
            >
              {f.hts}
            </button>
            <div className="mt-1 space-y-1 text-xs">
              <div className="text-muted-foreground">加入日期：{f.addedAt || 'N/A'}</div>
              {f.description ? (
                <div className="text-foreground text-sm leading-tight">{f.description}</div>
              ) : null}
              {f.note ? (
                <div className="text-foreground">備註：{f.note}</div>
              ) : null}
            </div>
          </div>
          <Button onClick={() => onRemove(f.hts)} variant="ghost" size="icon">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<Star className="h-10 w-10" />}
      title={tAny('favorites.emptyTitle')}
      description={tAny('favorites.emptyDesc')}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            {tAny('favorites.dialogTitle')}
          </DialogTitle>
          <DialogDescription>{tAny('favorites.dialogDesc')}</DialogDescription>
        </DialogHeader>
        {draftFavorite && onAddFavorite ? (
          <div className="mb-4 space-y-2 rounded-xl border border-dashed border-border p-3">
            <div className="flex flex-col gap-1">
              <div className="font-mono text-sm text-foreground">待加入 HTS：{draftFavorite.hts}</div>
              {draftFavorite.description ? (
                <div className="text-xs text-muted-foreground leading-snug">HTS 描述：{draftFavorite.description}</div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="輸入備註（選填）"
                className="w-full"
              />
              <div className="flex gap-2">
                <Button onClick={() => { onAddFavorite(note.trim()); setNote(''); onClose(); }} disabled={!draftFavorite.hts}>
                  確認加入
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {content}
      </DialogContent>
    </Dialog>
  );
};
