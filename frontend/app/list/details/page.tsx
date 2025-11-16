"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Film, Edit2, Save, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchSeriesById,
  updateSeasonDownloadUrls,
  syncSeriesMetadata,
  updateSeries,
  getSeriesPosterUrl,
  type SeriesDetail,
  type Season,
} from "@/lib/api";
import { Label } from "@/components/ui/label";

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
  const [editingSeasonId, setEditingSeasonId] = useState<number | null>(null);
  const [editUrls, setEditUrls] = useState<string>("");
  const [saving, setSaving] = useState(false);
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

  const handleEditUrls = (season: Season) => {
    setEditingSeasonId(season.id);
    const urls = season.downloadUrls && season.downloadUrls.length > 0
      ? season.downloadUrls.join("\n")
      : "";
    setEditUrls(urls);
  };

  const handleCancelEdit = () => {
    setEditingSeasonId(null);
    setEditUrls("");
  };

  const handleSaveUrls = async (seasonId: number) => {
    setSaving(true);
    try {
      const urlsArray = editUrls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      await updateSeasonDownloadUrls(seasonId, {
        downloadUrls: JSON.stringify(urlsArray)
      });

      if (seriesId) {
        await fetchSeriesDetail(parseInt(seriesId));
      }
      setEditingSeasonId(null);
      setEditUrls("");
      toast.success("Identificatori aggiornati");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSaving(false);
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

  const totalMissingEpisodes = series.seasons.reduce(
    (sum, s) => sum + (s.missingEpisodes || 0),
    0
  );
  const genres = parseGenres(series.genres || null);
  const alternateTitles = parseAlternateTitles(series.alternateTitles || null);

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
                <span className="text-muted-foreground">Episodi mancanti:</span>
                <span className="ml-2 font-medium text-red-600 dark:text-red-400">
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
        ) : (
          series.seasons.map((season) => {
            const isEditing = editingSeasonId === season.id;
            const downloadUrls = season.downloadUrls && season.downloadUrls.length > 0
              ? season.downloadUrls
              : [];

            return (
              <div key={season.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        Stagione {season.seasonNumber}
                      </h3>
                      {!!season.deleted && (
                        <Badge variant="secondary">
                          Non presente su Sonarr
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>{season.totalEpisodes} episodi</span>
                      {season.missingEpisodes > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {season.missingEpisodes} mancanti
                        </span>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUrls(season)}
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Modifica Identificatori
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Identificatori Anime (uno per riga)
                      </label>
                      <textarea
                        value={editUrls}
                        onChange={(e) => setEditUrls(e.target.value)}
                        className="w-full h-32 px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                        placeholder="one-piece.12345&#10;one-piece-part-2.12346"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Inserisci un identificatore per riga (es: one-piece.12345).
                        Verranno combinati con il dominio base per creare gli URL completi.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveUrls(season.id)}
                        disabled={saving}
                        size="sm"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Salvataggio...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-2" />
                            Salva
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={saving}
                        size="sm"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Annulla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {downloadUrls.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Identificatori Anime ({downloadUrls.length}):
                        </p>
                        <div className="bg-muted rounded p-3 max-h-32 overflow-y-auto">
                          {downloadUrls.map((url: string, index: number) => (
                            <div
                              key={index}
                              className="text-xs text-muted-foreground font-mono truncate"
                            >
                              {url}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nessun identificatore configurato
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
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
