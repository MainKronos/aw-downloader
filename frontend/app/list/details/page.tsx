"use client";

import { useEffect, useState, useTransition, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Film, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSeriesById,
  syncSeriesMetadata,
  updateSeries,
  getSeriesPosterUrl,
  type SeriesDetail,
} from "@/lib/api";
import { Label } from "@/components/ui/label";
import { SeasonCard } from "@/components/season-card";

const languageLabels: Record<string, string> = {
  dub: "Doppiato",
  sub: "Sottotitolato",
  dub_fallback_sub: "Doppiato (fallback su sub)"
};

function SeriesDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesId = searchParams.get('id');

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncingMetadata, startSyncingMetadata] = useTransition();

  useEffect(() => {
    if (!seriesId) {
      setError("ID serie non specificato");
      setLoading(false);
      return;
    }

    const id = parseInt(seriesId);
    if (isNaN(id)) {
      setError("ID serie non valido");
      setLoading(false);
      return;
    }

    fetchSeriesDetail(id);
  }, [seriesId]);

  const fetchSeriesDetail = async (id: number) => {
    try {
      setLoading(true);
      const data = await fetchSeriesById(id);
      setSeries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  };

  const parseGenres = (genresJson: string | null) => {
    if (!genresJson) return [];
    try {
      return JSON.parse(genresJson);
    } catch {
      return [];
    }
  };

  const parseAlternateTitles = (alternateTitlesJson: string | null) => {
    if (!alternateTitlesJson) return [];
    try {
      const parsed = JSON.parse(alternateTitlesJson);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => item.title).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  };

  const handleSyncMetadata = () => {
    if (!seriesId) return;

    startSyncingMetadata(async () => {
      try {
        await syncSeriesMetadata(parseInt(seriesId!));
        toast.success("Metadati sincronizzati con successo");
        await fetchSeriesDetail(parseInt(seriesId!));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Errore sincronizzazione metadati");
      }
    });
  };

  const handlePreferredLanguageChange = async (value: string) => {
    if (!seriesId) return;

    try {
      await updateSeries(parseInt(seriesId), { preferredLanguage: value });
      toast.success(`Lingua preferita aggiornata: ${languageLabels[value] || value}`);
      await fetchSeriesDetail(parseInt(seriesId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore aggiornamento lingua");
    }
  };

  const handleAbsoluteToggle = async (checked: boolean) => {
    if (!seriesId) return;

    try {
      await updateSeries(parseInt(seriesId), { absolute: checked });
      toast.success(checked ? "Numerazione assoluta attivata" : "Numerazione assoluta disattivata");
      await fetchSeriesDetail(parseInt(seriesId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore aggiornamento numerazione");
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !series || !seriesId) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => router.push("/list")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
        <div className="mt-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            Errore: {error || "Serie non trovata"}
          </p>
        </div>
      </div>
    );
  }

  const totalMissingEpisodes = series.countMissingEpisodes;
  const totalEpisodes = series.countTotalEpisodes;

  const genres = parseGenres(series.genres || null);
  const alternateTitles = parseAlternateTitles(series.alternateTitles || null);

  const seasonsToDisplay = series.absolute
    ? series.seasons.filter(s => s.seasonNumber === 1)
    : series.seasons;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push("/list")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>

        <Button
          onClick={handleSyncMetadata}
          disabled={isSyncingMetadata}
          variant="default"
        >
          {isSyncingMetadata ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sincronizzazione...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizza Metadati
            </>
          )}
        </Button>
      </div>

      {/* Series Info */}
      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex gap-6">
          {series.posterPath ? (
            <img
              src={getSeriesPosterUrl(series.id)}
              alt={series.title}
              className="w-48 h-72 object-cover rounded-lg"
            />
          ) : (
            <div className="w-48 h-72 bg-muted rounded-lg flex items-center justify-center">
              <Film className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{series.title}</h1>

            {alternateTitles.length > 0 && (
              <div className="mb-3">
                <span className="text-sm text-muted-foreground">Titoli alternativi: </span>
                <span className="text-sm text-foreground">
                  {alternateTitles.join(", ")}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {series.year && (
                <span className="px-2 py-1 bg-muted text-foreground text-sm rounded">
                  {series.year}
                </span>
              )}
              {series.network && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm rounded">
                  {series.network}
                </span>
              )}
              {genres.map((genre: string) => (
                <span
                  key={genre}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-sm rounded"
                >
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-foreground mb-4">{series.description}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Stato:</span>
                <span className="ml-2 font-medium">{series.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stagioni:</span>
                <span className="ml-2 font-medium">{series.seasons.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Totale episodi monitorati:</span>
                <span className="ml-2 font-medium">{totalEpisodes}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Episodi mancanti:</span>
                <span className={`ml-2 font-medium text-${totalMissingEpisodes > 0 ? 'red' : 'green'}-600 dark:text-${totalMissingEpisodes > 0 ? 'red' : 'green'}-400`}>
                  {totalMissingEpisodes}
                </span>
              </div>
            </div>

            {/* Preferred Language Selector */}
            <div className="flex items-start justify-between space-x-4 mt-4 pt-4 border-t">
              <div className="space-y-1 flex-1">
                <Label htmlFor="preferred-language">Lingua preferita</Label>
                <p className="text-sm text-muted-foreground">
                  Seleziona la lingua preferita per gli episodi
                </p>
              </div>
              <Select
                value={series.preferredLanguage}
                onValueChange={handlePreferredLanguageChange}
              >
                <SelectTrigger id="preferred-language" className="w-[200px]">
                  <SelectValue placeholder="Seleziona lingua" />
                </SelectTrigger>
                <SelectContent>
                  {languageLabels && Object.entries(languageLabels).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Absolute Numbering Switch */}
            <div className="flex items-start justify-between space-x-4 mt-4 pt-4 border-t">
              <div className="space-y-1 flex-1">
                <Label htmlFor="absolute-numbering" className="cursor-pointer">
                  Numerazione assoluta
                </Label>
                <p className="text-sm text-muted-foreground">
                  Utilizza la numerazione assoluta degli episodi (tutte le stagioni in un'unica sequenza)
                </p>
              </div>
              <Switch
                id="absolute-numbering"
                checked={series.absolute || false}
                onCheckedChange={handleAbsoluteToggle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seasons */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Stagioni</h2>

        {series.seasons.length === 0 ? (
          <div className="bg-muted border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nessuna stagione disponibile</p>
          </div>
        ) : (<>
          {seasonsToDisplay.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              seriesTitle={series.title}
              isAbsolute={series.absolute || false}
              totalEpisodes={totalEpisodes}
              totalMissingEpisodes={totalMissingEpisodes}
              onUpdate={() => seriesId && fetchSeriesDetail(parseInt(seriesId))}
            />
          ))}
        </>
        )}
      </div>
    </div>
  );
}

export default function SeriesDetailPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <SeriesDetailContent />
    </Suspense>
  );
}
