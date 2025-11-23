"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MultiSelect } from "@/components/ui/multi-select";
import { Loader2, Plus, Pencil, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createNotification, updateNotification, type Notification } from "@/lib/api";

const EVENT_OPTIONS = [
  { value: "onDownloadSuccessful", label: "Download Completato" },
  { value: "onDownloadError", label: "Errore Download" },
];

interface NotificationDialogProps {
  notification?: Notification;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function NotificationDialog({ notification, onSuccess, trigger }: NotificationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", events: [] as string[] });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isEditMode = !!notification;

  // Initialize form data when notification prop changes or dialog opens
  useEffect(() => {
    if (notification && isOpen) {
      setFormData({ 
        name: notification.name, 
        url: notification.url,
        events: notification.events || []
      });
    } else if (!isOpen) {
      setFormData({ name: "", url: "", events: [] });
      setError(null);
    }
  }, [notification, isOpen]);

  const handleSave = () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      setError("Nome e URL sono obbligatori");
      return;
    }

    if (!formData.events || formData.events.length === 0) {
      setError("Seleziona almeno un evento");
      return;
    }

    setError(null);
    startSaving(async () => {
      try {
        if (isEditMode) {
          await updateNotification(notification.id, { 
            name: formData.name, 
            url: formData.url,
            events: formData.events
          });
          toast.success("Notifica modificata");
        } else {
          await createNotification(formData.name, formData.url, true, formData.events);
          toast.success("Notifica aggiunta");
        }
        setFormData({ name: "", url: "", events: [] });
        setIsOpen(false);
        onSuccess?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Errore ${isEditMode ? 'modifica' : 'aggiunta'} notifica`;
        setError(errorMessage);
      }
    });
  };

  const defaultTrigger = isEditMode ? (
    <Button size="icon" variant="ghost" className="h-8 w-8">
      <Pencil className="h-4 w-4" />
    </Button>
  ) : (
    <Button size="sm" variant="outline">
      <Plus className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifica Notifica' : 'Aggiungi Notifica'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Modifica i dettagli della notifica'
              : 'Configura una nuova notifica per ricevere aggiornamenti sui download completati'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="notification-name" className="text-sm">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="notification-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="es. Telegram, Discord, Email..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="notification-url" className="text-sm">
              URL Notifica <span className="text-red-500">*</span>
            </Label>
            <Input
              id="notification-url"
              type="text"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="es. tgram://bottoken/chatid"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Url di notifica supportato da Apprise
            </p>
          </div>
          <div>
            <Label htmlFor="notification-events" className="text-sm">
              Eventi <span className="text-red-500">*</span>
            </Label>
            <MultiSelect
              options={EVENT_OPTIONS}
              selected={formData.events}
              onChange={(events) => setFormData(prev => ({ ...prev, events }))}
              placeholder="Seleziona eventi"
              emptyText="Nessun evento disponibile"
              searchPlaceholder="Cerca eventi..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Seleziona quando ricevere le notifiche
            </p>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim() || !formData.url.trim() || formData.events.length === 0}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditMode ? 'Modifica in corso...' : 'Aggiunta in corso...'}
              </>
            ) : (
              isEditMode ? 'Modifica Notifica' : 'Aggiungi Notifica'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
