import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { BackButton } from "@/components/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMUNITY_LIST } from "@/lib/communities";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  event_id: string;
  events?: { name: string; community: string; event_date: string | null; description: string | null } | null;
};

const Gallery = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [community, setCommunity] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [eventId, setEventId] = useState<string>("all");
  const [open, setOpen] = useState<GalleryItem | null>(null);

  useEffect(() => {
    supabase
      .from("event_gallery")
      .select("id, image_url, caption, event_id, events!inner(name, community, event_date, description)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as any));
  }, []);

  const events = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    items.forEach((i) => i.events && map.set(i.event_id, { id: i.event_id, name: i.events.name }));
    return Array.from(map.values());
  }, [items]);

  const years = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.events?.event_date && set.add(new Date(i.events.event_date).getFullYear().toString()));
    return Array.from(set).sort().reverse();
  }, [items]);

  const filtered = items.filter((i) => {
    if (community !== "all" && i.events?.community !== community) return false;
    if (eventId !== "all" && i.event_id !== eventId) return false;
    if (year !== "all" && (!i.events?.event_date || new Date(i.events.event_date).getFullYear().toString() !== year)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="container py-10">
        <BackButton />
        <h1 className="text-3xl md:text-4xl font-bold">Event <span className="text-gradient-gold">Gallery</span></h1>
        <p className="mt-2 text-muted-foreground">Stories and snapshots from our community.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 max-w-2xl">
          <Select value={community} onValueChange={setCommunity}>
            <SelectTrigger><SelectValue placeholder="Community" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All communities</SelectItem>
              {COMMUNITY_LIST.map((c) => <SelectItem key={c.key} value={c.short}>{c.short}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger><SelectValue placeholder="Event" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 glass rounded-2xl p-10 text-center text-muted-foreground">No photos yet for this filter.</div>
        ) : (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 8) * 0.04 }}
                onClick={() => setOpen(g)}
                className="group relative aspect-square overflow-hidden rounded-xl glass hover:border-primary/50 transition-smooth"
              >
                <img src={g.image_url} alt={g.caption ?? g.events?.name ?? "gallery"} loading="lazy" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-background/95 to-transparent text-xs">
                  <div className="font-medium truncate">{g.events?.name}</div>
                  <div className="text-[10px] text-gold">{g.events?.community}</div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {open && (
          <button onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={open.image_url} alt={open.caption ?? "gallery"} className="w-full max-h-[70vh] object-contain rounded-2xl shadow-elevated" />
              <div className="mt-4 glass-strong rounded-xl p-4 text-left">
                <div className="text-xs text-gold uppercase tracking-wide flex items-center gap-1"><Calendar className="h-3 w-3" />{open.events?.community}</div>
                <h3 className="mt-1 text-lg font-semibold">{open.events?.name}</h3>
                {open.caption && <p className="text-sm text-muted-foreground mt-1">{open.caption}</p>}
                {open.events?.description && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{open.events.description}</p>}
              </div>
            </div>
          </button>
        )}
      </div>
    </Layout>
  );
};

export default Gallery;
