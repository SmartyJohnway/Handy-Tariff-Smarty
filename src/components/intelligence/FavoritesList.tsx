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
import { useTranslation } from 'react-i18next';

interface Favorite {
  hts: string;
  note: string;
}

interface FavoritesModalProps {
  open: boolean;
  onClose: () => void;
  favorites: Favorite[];
  onSelect: (hts: string) => void;
  onRemove: (hts: string) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  open,
  onClose,
  favorites,
  onSelect,
  onRemove,
}) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;

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
            <div className="text-xs text-muted-foreground">{f.note}</div>
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
        {content}
      </DialogContent>
    </Dialog>
  );
};
