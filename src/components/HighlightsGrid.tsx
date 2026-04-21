import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type H = { id: string; image_url: string; caption: string | null };

export const HighlightsGrid = () => {
  const [items, setItems] = useState<H[]>([]);
  const [open, setOpen] = useState<H | null>(null);

  useEffect(() => {
    supabase.from("highlights").select("id, image_url, caption").order("created_at", { ascending: false }).limit(12)
      .then(({ data }) => setItems(data ?? []));
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">From our <span className="text-gradient-gold">past events</span></h2>
          <p className="mt-2 text-muted-foreground">Snapshots of what we've built together.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((h, i) => (
            <motion.button
              key={h.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setOpen(h)}
              className="group relative aspect-square overflow-hidden rounded-xl glass hover:border-primary/50 transition-smooth"
            >
              <img src={h.image_url} alt={h.caption ?? "highlight"} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              {h.caption && (
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-background/90 to-transparent text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  {h.caption}
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {open && (
          <button onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-6">
            <img src={open.image_url} alt={open.caption ?? "highlight"} className="max-h-[85vh] max-w-full rounded-2xl shadow-elevated" />
          </button>
        )}
      </div>
    </section>
  );
};
