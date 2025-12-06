import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// --- Type Definitions ---

interface Country {
  country: string;
  latest?: {
    title: string;
    document_number: string;
    url: string;
  };
}

interface ADCVDCoutryTrackerProps {
  isLoading: boolean;
  countryList: Country[];
  updatedAt: string | null;
  onViewDetails: (country: string, docNumber: string) => void;
}

// --- Helper Functions ---

const countryNameToCode: Record<string, string> = {
  'Brazil': 'BR',
  'China': 'CN',
  'Germany': 'DE',
  'India': 'IN',
  'Indonesia': 'ID',
  'Italy': 'IT',
  'Japan': 'JP',
  'Mexico': 'MX',
  'South Korea': 'KR',
  'Korea, Republic of': 'KR',
  'Taiwan': 'TW',
  'Thailand': 'TH',
  'Turkey': 'TR',
  'The Netherlands': 'NL',
  'Netherlands': 'NL',
  'United Kingdom': 'GB',
  'Vietnam': 'VN',
  // Add other frequent countries here
};

function getFlagEmoji(countryName: string): string {
  const code = countryNameToCode[countryName];
  if (!code) return '🏳️'; // Default flag
  return code.toUpperCase().replace(/./g, char => 
    String.fromCodePoint(char.charCodeAt(0) + 127397)
  );
}

// --- UI Components ---

const LoadingSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[25%]"><Skeleton className="h-5 w-24" /></TableHead>
        <TableHead><Skeleton className="h-5 w-32" /></TableHead>
        <TableHead className="text-right w-[120px]"><Skeleton className="h-5 w-20" /></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[...Array(3)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
          <TableCell><Skeleton className="h-5 w-full" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-9 w-24" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// --- Main Component ---

export const ADCVDCoutryTracker: React.FC<ADCVDCoutryTrackerProps> = ({ 
  isLoading, 
  countryList, 
  updatedAt, 
  onViewDetails 
}) => {
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const hasCountries = countryList && countryList.length > 0;

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{tAny('adcvdTracker.title')}</CardTitle>
            {updatedAt && <p className="text-xs text-muted-foreground mt-1">{tAny('adcvdTracker.lastUpdated', { date: new Date(updatedAt).toLocaleString() })}</p>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSkeleton />
        ) : hasCountries ? (
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">{tAny('adcvdTracker.country')}</TableHead>
                  <TableHead>{tAny('adcvdTracker.rates')}</TableHead>
                  <TableHead className="text-right w-[120px]">{tAny('adcvdTracker.detailsHeader')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countryList.map((country) => (
                  <TableRow key={country.country}>
                    <TableCell className="font-medium">
                      <span className="mr-2 text-lg" role="img" aria-label={country.country}>{getFlagEmoji(country.country)}</span>
                      {country.country}
                    </TableCell>
                    <TableCell>
                      {country.latest?.title ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={country.latest.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-muted-foreground hover:text-primary hover:underline line-clamp-2"
                            >
                              {country.latest.title}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent><p className="max-w-md">{country.latest.title}</p></TooltipContent>
                        </Tooltip>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">{tAny('adcvdTracker.noRecent')}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => country.latest?.document_number && onViewDetails(country.country, country.latest.document_number)} 
                        disabled={!country.latest?.document_number}
                      >
                        {tAny('adcvdTracker.viewDetails')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        ) : (
          <EmptyState 
            icon={<FileText className="h-10 w-10" />}
            title={tAny('adcvdTracker.emptyTitle')}
            description={tAny('adcvdTracker.emptyDesc')}
          />
        )}
      </CardContent>
    </Card>
  );
};
