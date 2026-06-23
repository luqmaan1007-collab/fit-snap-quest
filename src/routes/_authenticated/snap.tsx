import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSnap, getSnapQuota, grantBonusSnap } from "@/lib/snap.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, Sparkles, Check, X, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { RewardedAd } from "@/components/RewardedAd";

export const Route = createFileRoute("/_authenticated/snap")({
  head: () => ({ meta: [{ title: "Snap a meal — Snapcal" }] }),
  component: SnapPage,
});

function SnapPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyzeFn = useServerFn(analyzeSnap);
  const quotaFn = useServerFn(getSnapQuota);
  const grantFn = useServerFn(grantBonusSnap);
  const { data: quota } = useQuery({ queryKey: ["snap-quota"], queryFn: () => quotaFn() });
  const [adOpen, setAdOpen] = useState(false);

  const mut = useMutation({
    mutationFn: (b64: string) => analyzeFn({ data: { imageBase64: b64, mime: "image/jpeg" } }),
    onSuccess: () => {
      toast.success("Logged!");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["snap-quota"] });
      setTimeout(() => navigate({ to: "/dashboard" }), 400);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bonusMut = useMutation({
    mutationFn: () => grantFn(),
    onSuccess: () => { toast.success("+1 snap added!"); qc.invalidateQueries({ queryKey: ["snap-quota"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    // Compress to ~1024px max edge for cost/latency
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f);
    });
    const max = 1024;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
  }

  const remaining = quota?.unlimited ? "Unlimited" : `${(quota?.limit ?? 3) - (quota?.used ?? 0)} of ${quota?.limit ?? 3} left today`;
  const blocked = !quota?.unlimited && (quota?.used ?? 0) >= (quota?.limit ?? 3);

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="font-display text-2xl font-bold">Snap a meal</h1>
      <p className="mt-1 text-xs text-muted-foreground">{remaining}{quota?.unlimited && <Sparkles className="ml-1 inline h-3 w-3 text-primary" />}</p>

      <Card className="glass-card mt-6 overflow-hidden rounded-3xl border-0 p-6">
        {preview ? (
          <div className="space-y-4">
            <img src={preview} alt="Preview" className="aspect-square w-full rounded-2xl object-cover" />
            {mut.isPending ? (
              <div className="text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto h-6 w-6 animate-pulse text-primary" />
                <div className="mt-2">Analyzing nutrition…</div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setPreview(null)}><X className="mr-1 h-4 w-4" />Retake</Button>
                <Button className="flex-1 rounded-full bg-primary text-primary-foreground" disabled={blocked}
                  onClick={() => preview && mut.mutate(preview)}>
                  <Check className="mr-1 h-4 w-4" />Analyze
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={() => fileRef.current?.click()} disabled={blocked}
              className="h-32 w-full rounded-2xl bg-primary text-primary-foreground" size="lg">
              <Camera className="mr-2 h-6 w-6" /> Take photo
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={blocked} variant="outline" className="w-full rounded-2xl" size="lg">
              <Upload className="mr-2 h-5 w-5" /> Upload from library
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            {blocked && (
              <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-center text-sm">
                <div className="font-semibold text-accent">Daily limit reached</div>
                <div className="mt-1 text-xs text-muted-foreground">Upgrade to Pro for unlimited snaps.</div>
                <Button className="mt-3 w-full rounded-full bg-accent text-accent-foreground" onClick={() => navigate({ to: "/settings" })}>Upgrade to Pro</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">AI nutrition is an estimate — adjust if needed.</p>
    </div>
  );
}
