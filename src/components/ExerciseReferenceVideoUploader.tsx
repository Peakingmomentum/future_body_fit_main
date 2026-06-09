import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2, Shield, Video, RefreshCw, Trash2, Sparkles, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  video_status: string | null;
  equipment: string | null;
  trainer_reference_url: string | null;
  reference_video_url: string | null;
}

export function ExerciseReferenceVideoUploader() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingExerciseId, setUploadingExerciseId] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [athleteGender, setAthleteGender] = useState<string>("male");
  const [trainerRefUrl, setTrainerRefUrl] = useState("");
  const [batchProgress, setBatchProgress] = useState<{ completed: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchExercises();
    }
  }, [isAdmin]);

  const fetchExercises = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, description, video_url, video_status, equipment, trainer_reference_url, reference_video_url")
      .order("name");

    if (error) {
      console.error("Failed to fetch exercises:", error);
      toast.error("Failed to load exercises");
    } else {
      setExercises((data as Exercise[]) || []);
    }
    setIsLoading(false);
  };

  if (roleLoading || !isAdmin) {
    return null;
  }

  const handleVideoUpload = async (exerciseId: string, file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file (MP4 recommended)");
      return;
    }

    setUploadingExerciseId(exerciseId);

    try {
      const exercise = exercises.find(e => e.id === exerciseId);
      const normalizedName = exercise?.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || exerciseId;
      const filePath = `exercise-videos/${normalizedName}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("user-photos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("exercises")
        .update({ video_url: publicUrl.publicUrl, video_status: "completed" })
        .eq("id", exerciseId);

      if (updateError) throw updateError;

      toast.success(`Video uploaded for ${exercise?.name}`);
      fetchExercises();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload video");
    } finally {
      setUploadingExerciseId(null);
    }
  };

  const handleRemoveVideo = async (exerciseId: string) => {
    try {
      const exercise = exercises.find(e => e.id === exerciseId);
      
      if (exercise?.video_url) {
        const normalizedName = exercise.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const filePath = `exercise-videos/${normalizedName}.mp4`;
        await supabase.storage.from("user-photos").remove([filePath]);
      }

      const { error } = await supabase
        .from("exercises")
        .update({ video_url: null, video_status: "pending" })
        .eq("id", exerciseId);

      if (error) throw error;

      toast.success("Video removed");
      fetchExercises();
    } catch (error) {
      console.error("Failed to remove video:", error);
      toast.error("Failed to remove video");
    }
  };

  const handleBatchGenerate = async (status: "pending" | "failed" = "pending") => {
    const targetExercises = exercises.filter(e => e.video_status === status);
    if (targetExercises.length === 0) {
      toast.info(`No ${status} exercises to generate`);
      return;
    }

    setIsBatchGenerating(true);
    setBatchProgress({ completed: 0, failed: 0, total: targetExercises.length });

    try {
      const { data, error } = await supabase.functions.invoke("batch-generate-exercise-videos", {
        body: {
          limit: targetExercises.length,
          status,
          athleteGender,
          trainerReferenceUrl: trainerRefUrl || undefined,
        },
      });

      if (error) throw error;

      setBatchProgress({
        completed: data?.completed || 0,
        failed: data?.failed || 0,
        total: data?.processed || targetExercises.length,
      });

      toast.success(`Batch complete: ${data?.completed || 0} generated, ${data?.failed || 0} failed`);
      fetchExercises();
    } catch (error: any) {
      console.error("Batch generation failed:", error);
      toast.error("Batch generation failed: " + (error.message || "Unknown error"));
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const videosCompleted = exercises.filter(e => e.video_status === "completed").length;
  const videosPending = exercises.filter(e => e.video_status === "pending" || !e.video_status).length;
  const videosGenerating = exercises.filter(e => e.video_status === "generating").length;
  const videosFailed = exercises.filter(e => e.video_status === "failed").length;
  const totalExercises = exercises.length;

  if (isLoading) {
    return (
      <Card className="border-primary/30">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Admin: Exercise Video Library
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-lg font-bold text-green-500">{videosCompleted}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 border border-border">
            <p className="text-lg font-bold text-foreground">{videosPending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-lg font-bold text-primary">{videosGenerating}</p>
            <p className="text-xs text-muted-foreground">Generating</p>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-lg font-bold text-destructive">{videosFailed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        <Progress value={(videosCompleted / Math.max(totalExercises, 1)) * 100} className="h-2" />

        {/* Batch Generation Controls */}
        <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Batch Generation
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Athlete Gender</Label>
              <Select value={athleteGender} onValueChange={setAthleteGender}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trainer Reference URL</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Optional image URL"
                value={trainerRefUrl}
                onChange={(e) => setTrainerRefUrl(e.target.value)}
              />
            </div>
          </div>

          {batchProgress && (
            <div className="text-xs text-muted-foreground">
              Last batch: {batchProgress.completed} completed, {batchProgress.failed} failed of {batchProgress.total}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleBatchGenerate("pending")}
              disabled={isBatchGenerating || videosPending === 0}
              className="flex-1 gap-1.5"
            >
              {isBatchGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Pending ({videosPending})
            </Button>
            {videosFailed > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchGenerate("failed")}
                disabled={isBatchGenerating}
                className="gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Retry Failed ({videosFailed})
              </Button>
            )}
          </div>
        </div>

        {/* Exercise List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{exercise.name}</p>
                    {exercise.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{exercise.description}</p>
                    )}
                    {exercise.equipment && (
                      <Badge variant="outline" className="mt-1 text-xs">{exercise.equipment}</Badge>
                    )}
                  </div>
                  {exercise.video_status === "completed" && exercise.video_url ? (
                    <Badge variant="default" className="bg-green-600">
                      <Video className="w-3 h-3 mr-1" />
                      Uploaded
                    </Badge>
                  ) : exercise.video_status === "generating" ? (
                    <Badge variant="default" className="bg-primary">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Generating
                    </Badge>
                  ) : exercise.video_status === "failed" ? (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Failed
                    </Badge>
                  ) : (
                    <Badge variant="outline">No video</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {exercise.video_url ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveVideo(exercise.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                      <Label htmlFor={`replace-${exercise.id}`} className="cursor-pointer">
                        <Button size="sm" variant="outline" asChild>
                          <span>
                            <Upload className="h-3 w-3 mr-1" />
                            Replace
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id={`replace-${exercise.id}`}
                        type="file"
                        accept="video/mp4,video/*"
                        className="hidden"
                        disabled={uploadingExerciseId === exercise.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(exercise.id, file);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Label htmlFor={`video-${exercise.id}`} className="cursor-pointer">
                        <Button size="sm" variant="outline" asChild disabled={uploadingExerciseId === exercise.id}>
                          <span>
                            {uploadingExerciseId === exercise.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3 mr-1" />
                            )}
                            Upload MP4
                          </span>
                        </Button>
                      </Label>
                      <Input
                        id={`video-${exercise.id}`}
                        type="file"
                        accept="video/mp4,video/*"
                        className="hidden"
                        disabled={uploadingExerciseId === exercise.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(exercise.id, file);
                        }}
                      />
                    </div>
                  )}
                </div>

                {exercise.video_url && (
                  <div className="pt-2">
                    <video src={exercise.video_url} controls className="w-full h-32 rounded object-cover" />
                  </div>
                )}
              </div>
            ))}

            {exercises.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No exercises found. Generate a workout first to create exercises.
              </p>
            )}
          </div>
        </ScrollArea>

        <Button variant="outline" onClick={fetchExercises} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Exercise List
        </Button>
      </CardContent>
    </Card>
  );
}
