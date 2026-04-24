import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, ImagePlus, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type GalleryRow = {
  id: string;
  event_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

type EventRow = { id: string; name: string; community: string };

export const ImageUploadPanel = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<GalleryRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data: imgs }, { data: evs }] = await Promise.all([
      supabase.from("event_gallery").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, name, community").order("created_at", { ascending: false }),
    ]);
    setImages((imgs as GalleryRow[]) ?? []);
    setEvents((evs as EventRow[]) ?? []);
    if (!eventId && evs && evs.length) setEventId(evs[0].id);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    if (!eventId) {
      toast({ title: "Pick an event first", variant: "destructive" });
      return;
    }
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of arr) {
      const path = `${eventId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("event-gallery").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        toast({ title: `Upload failed: ${file.name}`, description: upErr.message, variant: "destructive" });
        continue;
      }
      const { data: pub } = supabase.storage.from("event-gallery").getPublicUrl(path);
      const { error: insErr } = await supabase.from("event_gallery").insert({
        event_id: eventId,
        image_url: pub.publicUrl,
        caption: caption || null,
        created_by: user?.id ?? null,
      });
      if (insErr) {
        toast({ title: `DB insert failed: ${file.name}`, description: insErr.message, variant: "destructive" });
        continue;
      }
      ok++;
    }
    setUploading(false);
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
    if (ok) toast({ title: `Uploaded ${ok} image${ok > 1 ? "s" : ""}` });
    load();
  };

  const deleteImage = async (img: GalleryRow) => {
    if (!confirm("Delete this image?")) return;
    const marker = "/event-gallery/";
    const idx = img.image_url.indexOf(marker);
    const path = idx >= 0 ? img.image_url.slice(idx + marker.length) : null;
    const { error } = await supabase.from("event_gallery").delete().eq("id", img.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    if (path) await supabase.storage.from("event-gallery").remove([decodeURIComponent(path)]);
    toast({ title: "Deleted" });
    load();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Upload event gallery images</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Event</label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name} <span className="text-muted-foreground">({e.community})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Caption (optional)</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Applied to this batch" />
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-smooth ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <p className="text-sm">Drag & drop images here, or click to browse</p>
              <p className="text-xs">PNG, JPG, WEBP · multiple files supported</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Gallery ({images.length})</h3>
        </div>
        {images.length === 0 ? (
          <div className="glass rounded-xl p-10 text-center text-muted-foreground">No images yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {images.map((img) => (
              <div key={img.id} className="glass rounded-xl overflow-hidden group relative">
                <img src={img.image_url} alt={img.caption ?? "gallery"} className="w-full aspect-square object-cover" loading="lazy" />
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => deleteImage(img)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-smooth h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="p-2 text-xs">
                  <div className="truncate font-medium">{eventName(img.event_id)}</div>
                  {img.caption && <div className="truncate text-muted-foreground">{img.caption}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
