"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateSeasonDownloadUrls, type Season } from "@/lib/api";

interface SeasonCardProps {
    season: Season;
    seriesTitle: string;
    isAbsolute: boolean;
    totalEpisodes?: number;
    totalMissingEpisodes?: number;
    onUpdate?: () => void;
}

export function SeasonCard({
    season,
    seriesTitle,
    isAbsolute,
    totalEpisodes,
    totalMissingEpisodes,
    onUpdate,
}: SeasonCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editUrls, setEditUrls] = useState("");
    const [saving, setSaving] = useState(false);

    const downloadUrls = season.downloadUrls && season.downloadUrls.length > 0
        ? season.downloadUrls
        : [];

    const handleEditUrls = () => {
        setIsEditing(true);
        const urls = downloadUrls.length > 0
            ? downloadUrls.join("\n")
            : "";
        setEditUrls(urls);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditUrls("");
    };

    const handleSaveUrls = async () => {
        setSaving(true);
        try {
            const urlsArray = editUrls
                .split("\n")
                .map((url) => url.trim())
                .filter((url) => url.length > 0);

            await updateSeasonDownloadUrls(season.id, {
                downloadUrls: JSON.stringify(urlsArray)
            });

            setIsEditing(false);
            setEditUrls("");
            toast.success("Identificatori aggiornati");

            if (onUpdate) {
                onUpdate();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Errore salvataggio");
        } finally {
            setSaving(false);
        }
    };

    const displayEpisodes = isAbsolute ? totalEpisodes : season.totalEpisodes;
    const displayMissing = isAbsolute ? totalMissingEpisodes : season.missingEpisodes;

    return (
        <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                            {isAbsolute ? "Episodi (Numerazione Assoluta)" : `Stagione ${season.seasonNumber}`}
                        </h3>
                        {!!season.deleted && (
                            <Badge variant="secondary">
                                Non presente su Sonarr
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>{displayEpisodes} episodi{isAbsolute ? " (totale)" : ""}</span>
                        {displayMissing! > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                                {displayMissing} mancanti
                            </span>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditUrls}
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
                            onClick={handleSaveUrls}
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
}
