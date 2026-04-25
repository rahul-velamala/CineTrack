"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, QrCode, Image as ImageIcon, Link2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface Props {
  handle: string;
  variant?: "full" | "compact";
}

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://cinetrack.vercel.app";
}

export default function InviteShareCard({ handle, variant = "full" }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [downloadingSticker, setDownloadingSticker] = useState(false);

  const profileUrl = `${siteOrigin()}/u/${handle}`;
  // Primary share URL = direct add-friend deep link (faster conversion).
  // Legacy ?invite= URLs still resolve for backward compat.
  const inviteUrl = `${siteOrigin()}/add/${encodeURIComponent(handle)}`;
  const linksUrl = `${siteOrigin()}/u/${handle}/links`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Long-press the URL to copy manually.");
    }
  };

  const nativeShare = async () => {
    const shareData = {
      title: `Join @${handle} on CineTrack`,
      text: `@${handle} invited you to CineTrack — track your movies & shows.`,
      url: inviteUrl,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      copyInvite();
    }
  };

  const downloadSticker = async () => {
    setDownloadingSticker(true);
    try {
      const res = await fetch(`/api/sticker/${encodeURIComponent(handle)}`);
      if (!res.ok) throw new Error("sticker fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cinetrack-${handle}-story.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Story sticker downloaded");
    } catch {
      toast.error("Could not generate sticker. Try again.");
    } finally {
      setDownloadingSticker(false);
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-cinema-muted">Your invite link</p>
        <div className="flex gap-2">
          <code className="flex-1 px-3 py-2 rounded-lg bg-cinema-surface border border-cinema-border/50 text-xs text-cinema-text truncate font-mono">
            {inviteUrl.replace(/^https?:\/\//, "")}
          </code>
          <button
            onClick={copyInvite}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/30 hover:bg-cinema-purple/25 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-cinema-card/60 border border-cinema-border/40 p-5 depth-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-cinema-text">Share your profile</h3>
          <p className="text-[11px] text-cinema-muted mt-0.5">
            Friends who tap your link land on a one-tap &ldquo;Add as friend&rdquo; page.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Invite link row */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cinema-muted mb-1.5 flex items-center gap-1.5">
            <Link2 className="w-3 h-3" /> Invite link
          </p>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-cinema-surface border border-cinema-border/50 text-xs text-cinema-text truncate font-mono">
              {inviteUrl.replace(/^https?:\/\//, "")}
            </code>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={copyInvite}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cinema-purple/15 text-cinema-purple border border-cinema-purple/30 hover:bg-cinema-purple/25 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </motion.button>
          </div>
        </div>

        {/* Bio link row */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-cinema-muted mb-1.5">
            Instagram bio link (linktree-style)
          </p>
          <code className="block px-3 py-2 rounded-lg bg-cinema-surface border border-cinema-border/50 text-xs text-cinema-text truncate font-mono">
            {linksUrl.replace(/^https?:\/\//, "")}
          </code>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={nativeShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold gradient-purple text-white hover:opacity-90 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowQR((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cinema-surface border border-cinema-border hover:border-cinema-purple/40 transition-all cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" /> {showQR ? "Hide QR" : "Show QR"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={downloadSticker}
            disabled={downloadingSticker}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cinema-surface border border-cinema-border hover:border-cinema-purple/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5" /> {downloadingSticker ? "Generating..." : "Story sticker"}
          </motion.button>
        </div>

        {/* QR code panel */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-white">
              <div className="flex-shrink-0">
                <QRCodeSVG
                  value={profileUrl}
                  size={180}
                  level="M"
                  marginSize={2}
                  bgColor="#ffffff"
                  fgColor="#0a0a14"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-cinema-bg">Scan to open profile</p>
                <p className="text-xs text-cinema-bg/60 mt-1">Show this on your phone, friend scans it. No app needed.</p>
                <p className="text-[11px] text-cinema-bg/50 mt-2 font-mono break-all">{profileUrl}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
