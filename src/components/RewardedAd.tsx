import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

export const ADSENSE_CLIENT = "ca-pub-4190568082423357";
export const ADSENSE_SLOT = "8738135912";
const WATCH_SECONDS = 15;

interface Props {
  open: boolean;
  onClose: () => void;
  onReward: () => void;
}

export function RewardedAd({ open, onClose, onReward }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(WATCH_SECONDS);
  const [rewarded, setRewarded] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    if (!open) { setSecondsLeft(WATCH_SECONDS); setRewarded(false); pushed.current = false; return; }
    // Push the ad once the slot is in the DOM
    const t = setTimeout(() => {
      try {
        if (!pushed.current) { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; }
      } catch (e) { console.warn("adsbygoogle push failed", e); }
    }, 100);
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(iv); setRewarded(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Watch to earn +1 snap</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-muted/30 p-2">
          <ins
            key={open ? "ad-open" : "ad-closed"}
            className="adsbygoogle"
            style={{ display: "inline-block", width: "300px", height: "250px" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={ADSENSE_SLOT}
          />
        </div>
        <div className="mt-2 text-center text-sm text-muted-foreground">
          {rewarded ? "Thanks! Tap claim to add +1 snap." : `Ad in progress… ${secondsLeft}s`}
        </div>
        <Button
          className="mt-2 w-full rounded-full bg-primary text-primary-foreground"
          disabled={!rewarded}
          onClick={() => { onReward(); onClose(); }}
        >
          {rewarded ? "Claim +1 snap" : `Please wait (${secondsLeft}s)`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
