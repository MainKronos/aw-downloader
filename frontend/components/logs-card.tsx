"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Trash2, RefreshCw, Info, AlertTriangle, CheckCircle, Bug, XCircle } from "lucide-react";
import { fetchLogs, clearLogs, LogLevel, type LogEntry } from "@/lib/api";

export function LogsCard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    try {
      const params = filterLevel !== "all" ? { level: filterLevel, limit: 100 } : { limit: 100 };
      const data = await fetchLogs(params);
      setLogs(data.logs);
      setError(null);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(err instanceof Error ? err.message : "Errore caricamento log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filterLevel]);

  const handleClear = async () => {
    try {
      await clearLogs();
      setLogs([]);
      console.log("Log cancellati con successo");
    } catch (err) {
      console.error("Errore cancellazione log:", err);
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR:
        return <XCircle className="h-4 w-4" />;
      case LogLevel.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case LogLevel.SUCCESS:
        return <CheckCircle className="h-4 w-4" />;
      case LogLevel.DEBUG:
        return <Bug className="h-4 w-4" />;
      case LogLevel.INFO:
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ERROR:
        return "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
      case LogLevel.WARNING:
        return "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case LogLevel.SUCCESS:
        return "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800";
      case LogLevel.DEBUG:
        return "bg-muted text-muted-foreground border";
      case LogLevel.INFO:
      default:
        return "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Log di Sistema
            </CardTitle>
            <CardDescription>
              Log in tempo reale delle operazioni del server
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filterLevel}
              onValueChange={(value: string) => setFilterLevel(value as LogLevel | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filtra livello" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value={LogLevel.ERROR}>Errori</SelectItem>
                <SelectItem value={LogLevel.WARNING}>Warning</SelectItem>
                <SelectItem value={LogLevel.SUCCESS}>Success</SelectItem>
                <SelectItem value={LogLevel.INFO}>Info</SelectItem>
                <SelectItem value={LogLevel.DEBUG}>Debug</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900" : ""}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Caricamento log...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-destructive">
              <XCircle className="h-8 w-8 mb-2" />
              <p className="font-medium">Errore di connessione</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={loadLogs}
              >
                Riprova
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Nessun log disponibile
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 text-sm border-b pb-2 last:border-0"
                >
                  <span className="text-xs text-muted-foreground font-mono mt-0.5 min-w-[70px]">
                    {formatTime(log.timestamp)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${getLevelColor(log.level)} flex items-center gap-1 px-2 py-0.5`}
                  >
                    {getLevelIcon(log.level)}
                    <span className="text-xs font-medium uppercase">{log.level}</span>
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {log.category}
                  </Badge>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
