import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifier = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifier must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();

  const addNotification = useCallback((message: string, type: NotificationType) => {
    toast({
      title: type.charAt(0).toUpperCase() + type.slice(1), // "Success", "Error", "Info"
      description: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <Toaster />
    </NotificationContext.Provider>
  );
};
