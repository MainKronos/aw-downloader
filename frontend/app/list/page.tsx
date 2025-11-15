"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2, ChevronLeft, ChevronRight, Film, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchSeries, deleteSeries, type Series, type PaginationMeta } from "@/lib/api";
import { debounce } from "lodash";

export default function ListaPage() {
  const router = useRouter();
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriesIdToDelete, setSeriesIdToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 10;

  const fetchSeriesList = async () => {
    setLoading(true);
    try {
      const data = await fetchSeries({ page, limit, search });
      setSeries(data.data);
      setMeta(data.meta);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeriesList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // Create debounced search function
  const debouncedSearch = useRef(
    debounce((searchValue: string) => {
      setSearch(searchValue);
      setPage(1);
    }, 500)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    debouncedSearch.cancel();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSeriesClick = (seriesId: number) => {
    router.push(`/list/details?id=${seriesId}`);
  };

  const handleDeleteClick = (seriesId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSeriesIdToDelete(seriesId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!seriesIdToDelete) return;
    
    setDeleting(true);
    try {
      await deleteSeries(seriesIdToDelete);
      
      // Refresh the list
      await fetchSeriesList();
      setDeleteDialogOpen(false);
      setSeriesIdToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading && series.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Lista Serie</h1>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Lista Serie</h1>
        <p className="text-muted-foreground">
          Gestisci e monitora le tue serie anime
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="Cerca per titolo..."
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cerca"
            )}
          </Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </form>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Errore: {error}</p>
        </div>
      )}

      {/* Series Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Titolo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-center">Stagioni</TableHead>
              <TableHead className="text-center">Episodi Mancanti</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Film className="h-8 w-8 mb-2" />
                    <p className="font-medium">Nessuna serie trovata</p>
                    <p className="text-sm mt-1">
                      {search
                        ? "Prova con un termine di ricerca diverso"
                        : "Le serie appariranno qui quando verranno sincronizzate da Sonarr"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              series.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSeriesClick(s.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.title}
                      {!!s.deleted && (
                        <Badge variant="destructive">
                          Non su Sonarr
                        </Badge>
                      )}
                      {s.hasMissingDownloadUrls && (
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                          Link mancanti
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        s.status === "continuing"
                          ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300"
                          : s.status === "ended"
                          ? "bg-muted text-muted-foreground"
                          : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{s.totalSeasons}</TableCell>
                  <TableCell className="text-center">
                    {s.totalMissingEpisodes > 0 ? (
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {s.totalMissingEpisodes}
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSeriesClick(s.id);
                        }}
                      >
                        Dettagli
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteClick(s.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.lastPage > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Pagina {meta.currentPage} di {meta.lastPage} ({meta.total} totali)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!meta.hasMorePages || loading}
            >
              Successiva
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente la serie dal database.
              Non sarà più visibile nella lista e tutte le informazioni associate verranno perse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
