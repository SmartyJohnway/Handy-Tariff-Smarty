import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown, ChevronUp } from 'lucide-react';

interface CollapsibleJsonProps {
  title: string;
  data: any;
  defaultOpen?: boolean;
}

export const CollapsibleJson: React.FC<CollapsibleJsonProps> = ({ title, data, defaultOpen = false }) => {
  if (!data) return null;

  return (
    <Collapsible defaultOpen={defaultOpen} className="mt-4 rounded-lg border bg-muted/50">
      <CollapsibleTrigger asChild>
        <div className="flex w-full cursor-pointer items-center justify-between p-4 font-medium text-foreground">
          <span>{title}</span>
          <ChevronsUpDown className="h-4 w-4" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="whitespace-pre-wrap break-all bg-muted p-4 text-sm text-foreground border-t border-border">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
};