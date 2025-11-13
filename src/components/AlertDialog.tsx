import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
}

export function AlertDialogComponent({
  open,
  onOpenChange,
  title,
  message,
  variant = 'info',
  confirmText = 'OK',
}: AlertDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      default:
        return <Info className="h-6 w-6 text-gray-600" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-600';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getIcon()}
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base text-gray-700 pt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 w-full">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant={getButtonVariant()}
            size="default"
            className={`min-w-[120px] h-10 font-medium flex items-center justify-center ${getButtonStyle()}`}
            style={{
              ...(variant === 'danger' && { 
                backgroundColor: '#dc2626', 
                color: 'white', 
                borderColor: '#dc2626',
                opacity: 1,
                visibility: 'visible',
                display: 'flex'
              }),
              ...(variant === 'warning' && { 
                backgroundColor: '#d97706', 
                color: 'white', 
                borderColor: '#d97706',
                opacity: 1,
                visibility: 'visible',
                display: 'flex'
              }),
              ...(variant === 'success' && { 
                backgroundColor: '#16a34a', 
                color: 'white', 
                borderColor: '#16a34a',
                opacity: 1,
                visibility: 'visible',
                display: 'flex'
              }),
              ...(variant === 'info' && { 
                backgroundColor: '#2563eb', 
                color: 'white', 
                borderColor: '#2563eb',
                opacity: 1,
                visibility: 'visible',
                display: 'flex'
              }),
            }}
          >
            {confirmText}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook để sử dụng alert dễ dàng hơn
import { useState, useCallback } from 'react';

interface AlertOptions {
  title?: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success';
  confirmText?: string;
}

export function useAlert() {
  const [alertState, setAlertState] = useState<{
    open: boolean;
    options: AlertOptions;
    resolve?: () => void;
  }>({
    open: false,
    options: { message: '' },
  });

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = (open: boolean) => {
    if (!open && alertState.resolve) {
      alertState.resolve();
    }
    setAlertState((prev) => ({ ...prev, open, resolve: undefined }));
  };

  const AlertComponent = () => (
    <AlertDialogComponent
      open={alertState.open}
      onOpenChange={handleClose}
      title={alertState.options.title || 'Thông báo'}
      message={alertState.options.message}
      variant={alertState.options.variant}
      confirmText={alertState.options.confirmText}
    />
  );

  return { alert, AlertComponent };
}

