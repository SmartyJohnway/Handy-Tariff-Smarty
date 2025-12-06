import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, className }) => {
  return (
    <Card className={`border-dashed ${className || ''}`}>
      <CardContent className="text-center py-10">
        {icon && <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">{icon}</div>}
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};