import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Shield, Video, Loader2, RefreshCw, Search,
  CheckCircle2, Clock, Filter, Database, Image,
  HardDrive, Link2,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  target_muscles: string[] | null;
  equipment: string | null;
  external_video_url: string | null;
  video_source: string | null;
}

type StatusFilter = "all" | "has_demo" | "no_demo";

export function AdminExerciseManager() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ batch: 0, inserted: 0, skipped: 0 });
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState({ cached: 0, failed: 0, remaining: 0, totalCached: 0 });
  const [isLinking, setIsLinking] = useState(false);
  const [linkResults, setLinkResults] = useState<{ linked: number; failed: number } | null>(null);

  useEffect(() => {
    if (isAdmin) fetchExercises();
  }, [isAdmin]);

  const fetchExercises = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, description, target_muscles, equipment, external_video_url, video_source")
      .order("name");

    if (error) {
      console.error("Failed to fetch exercises:", error);
      toast.error("Failed to load exercises");
    } else {
      setExercises((data as Exercise[]) || []);
    }
    setIsLoading(false);
  };

  const handleSyncExerciseDB = async () => {
    setIsSyncing(true);
    setSyncProgress({ batch: 0, inserted: 0, skipped: 0 });
    const BATCH_SIZE = 10;
    let offset = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalUpdated = 0;
    let batchNum = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        batchNum++;
        setSyncProgress({ batch: batchNum, inserted: totalInserted, skipped: totalSkipped });

        const { data, error } = await supabase.functions.invoke("sync-exercisedb", {
          body: { offset, limit: BATCH_SIZE },
        });

        if (error) throw error;

        if (data.quotaExceeded) {
          toast.error("ExerciseDB monthly API quota exceeded. Wait for reset or upgrade your RapidAPI plan.");
          break;
        }

        totalInserted += data.inserted || 0;
        totalSkipped += data.skipped || 0;
        totalUpdated += data.updated || 0;
        hasMore = data.hasMore === true;
        offset += BATCH_SIZE;

        if (hasMore) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      toast.success(`Sync complete! Added ${totalInserted}, updated ${totalUpdated} demos (${totalSkipped} unchanged)`);
      fetchExercises();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(err.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCacheGifs = async () => {
    setIsCaching(true);
    setCacheProgress({ cached: 0, failed: 0, remaining: 0, totalCached: 0 });
    let totalCached = 0;
    let totalFailed = 0;
    let remaining = 999;

    try {
      while (remaining > 0) {
        const { data, error } = await supabase.functions.invoke("cache-exercise-gifs", {
          body: { limit: 15 },
        });

        if (error) throw error;

        if (data.quotaExceeded) {
          toast.error("ExerciseDB API quota exceeded. Try again later.");
          break;
        }

        totalCached += data.cached || 0;
        totalFailed += data.failed || 0;
        remaining = data.remaining || 0;
        setCacheProgress({ cached: totalCached, failed: totalFailed, remaining, totalCached: data.totalCached || 0 });

        if (remaining === 0 || data.cached === 0) break;

        // Delay between batches
        await new Promise(r => setTimeout(r, 2000));
      }

      toast.success(`Cached ${totalCached} GIFs to storage! ${totalFailed > 0 ? `(${totalFailed} failed)` : ''}`);
      fetchExercises();
    } catch (err: any) {
      console.error("Cache error:", err);
      toast.error(err.message || "Caching failed");
    } finally {
      setIsCaching(false);
    }
  };

  const handleLinkMissing = async () => {
    setIsLinking(true);
    setLinkResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("link-missing-exercises");
      if (error) throw error;
      setLinkResults({ linked: data.linked || 0, failed: data.failed || 0 });
      toast.success(`Linked ${data.linked} exercises! ${data.failed > 0 ? `(${data.failed} unresolved)` : ''}`);
      if (data.results) {
        console.log("Link results:", data.results);
      }
      fetchExercises();
    } catch (err: any) {
      console.error("Link error:", err);
      toast.error(err.message || "Linking failed");
    } finally {
      setIsLinking(false);
    }
  };

  const filteredExercises = exercises.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "has_demo") return matchesSearch && !!e.external_video_url;
    if (statusFilter === "no_demo") return matchesSearch && !e.external_video_url;
    return matchesSearch;
  });

  const counts = {
    all: exercises.length,
    has_demo: exercises.filter(e => !!e.external_video_url).length,
    no_demo: exercises.filter(e => !e.external_video_url).length,
  };

  const coveragePercent = counts.all > 0 ? (counts.has_demo / counts.all) * 100 : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Admin: Exercise Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coverage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ExerciseDB Coverage</span>
            <span className="font-medium text-foreground">{counts.has_demo}/{counts.all}</span>
          </div>
          <Progress value={coveragePercent} className="h-2" />
        </div>

        {/* Sync ExerciseDB Button */}
        <Button
          onClick={handleSyncExerciseDB}
          disabled={isSyncing}
          className="w-full gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing batch {syncProgress.batch}... ({syncProgress.inserted} added)
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              Sync ExerciseDB Library
            </>
          )}
        </Button>

        {/* Cache GIFs to Storage */}
        <Button
          onClick={handleCacheGifs}
          disabled={isCaching || isSyncing}
          variant="secondary"
          className="w-full gap-2"
        >
          {isCaching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Caching... {cacheProgress.cached} done ({cacheProgress.remaining} left)
            </>
          ) : (
            <>
              <HardDrive className="h-4 w-4" />
              Cache GIFs to Storage
            </>
          )}
        </Button>

        {/* Link Missing Demos */}
        <Button
          onClick={handleLinkMissing}
          disabled={isLinking || isSyncing || isCaching}
          variant="outline"
          className="w-full gap-2"
        >
          {isLinking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Linking missing demos...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Link Missing Demos
              {linkResults && <span className="text-xs text-muted-foreground ml-1">({linkResults.linked} linked)</span>}
            </>
          )}
        </Button>

        <div className="flex flex-wrap gap-1.5">
          {(["all", "has_demo", "no_demo"] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className="h-7 text-xs gap-1 px-2.5"
            >
              {status === "all" ? <Filter className="w-3 h-3" /> :
               status === "has_demo" ? <Image className="w-3 h-3" /> :
               <Video className="w-3 h-3" />}
              {status === "all" ? "All" : status === "has_demo" ? "Has Demo" : "Missing"} ({counts[status]})
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-2">
            <div className="space-y-2">
              {filteredExercises.map((exercise) => {
                const hasDemo = !!exercise.external_video_url;

                return (
                  <div key={exercise.id} className="border rounded-lg p-3 flex items-start gap-3 bg-muted/20">
                    <div className="w-16 h-20 rounded-md overflow-hidden bg-muted/50 border border-border flex-shrink-0 flex items-center justify-center">
                      {hasDemo ? (
                        <img src={exercise.external_video_url!} alt={exercise.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Video className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-tight truncate">{exercise.name}</p>
                        <Badge className={`${hasDemo ? "bg-green-600" : "bg-muted-foreground"} text-white text-[10px] h-5 flex-shrink-0`}>
                          {hasDemo ? <><CheckCircle2 className="w-3 h-3 mr-0.5" /> Demo</> : <><Clock className="w-3 h-3 mr-0.5" /> Missing</>}
                        </Badge>
                      </div>

                      {exercise.equipment && (
                        <Badge variant="outline" className="text-[10px] h-4">{exercise.equipment}</Badge>
                      )}

                      {exercise.target_muscles && exercise.target_muscles.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate">{exercise.target_muscles.join(", ")}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredExercises.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {searchQuery ? "No exercises match your search" : "No exercises found"}
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        <Button variant="outline" onClick={fetchExercises} className="w-full" size="sm">
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
