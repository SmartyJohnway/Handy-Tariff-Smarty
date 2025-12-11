import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link2Off, ArrowUpRightFromSquare } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from 'react-i18next';

interface Link {
  title: string;
  url: string;
}

interface IDSLinksCardProps {
  isLoading: boolean;
  links: Link[];
}

export const IDSLinksCard: React.FC<IDSLinksCardProps> = ({ isLoading, links }) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const hasLinks = links && links.length > 0;

  return (
    <TooltipProvider>
      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="break-words">{tAny('idsLinks.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* --- Original Link Display Functionality --- */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : hasLinks ? (
            <div className="space-y-2">
              {links.map((link, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ArrowUpRightFromSquare className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="break-all">{link.title}</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-md">{link.title}</p></TooltipContent>
                </Tooltip>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Link2Off className="h-10 w-10" />}
              title={tAny('idsLinks.emptyTitle')}
              description={tAny('idsLinks.emptyDesc')}
            />
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
