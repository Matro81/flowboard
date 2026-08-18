import { create } from "zustand";
import { ensureBoardProject, createRequest, getRequest, patchNode } from "../api/client";
import { useBoardStore } from "./board";
import { useSettingsStore } from "./settings";

type PollEntry = { requestId: number; timerId: ReturnType<typeof setTimeout> | null };

interface GenerationState {
  active: Record<string, PollEntry>;
  openDialog: {
    rfId: string | null;
    prompt: string;
    targetSlot?: "headshot" | "turnaround";
  };
  openViewer: { rfId: string | null; idx: number };
  projectId: string | null;
  // Auto-detected from Flow's createProject response — used as the
  // default tier for every dispatch so the UI no longer needs to ask.
  // Null until the first successful project bootstrap.
  paygateTier: "PAYGATE_TIER_ONE" | "PAYGATE_TIER_TWO" | null;
  error: string | null;

  openGenerationDialog(
    rfId: string,
    prompt: string,
    opts?: { targetSlot?: "headshot" | "turnaround" },
  ): void;
  closeGenerationDialog(): void;
  openResultViewer(rfId: string, idx?: number): void;
  closeResultViewer(): void;

  ensureProjectId(): Promise<string | null>;

  dispatchGeneration(
    rfId: string,
    opts: {
      prompt: string;
      aspectRatio?: string;
      paygateTier?: string;
      kind?: "image" | "video";
      sourceMediaId?: string;
      // Multi-source-image i2v: when the upstream image has N variants
      // we generate one video per variant. Backend sends N items in the
      // batchAsyncGenerate body so all are dispatched together.
      sourceMediaIds?: string[];
      variantCount?: number;
      // Per-variant prompts. When provided, each variant uses its own
      // prompt — required for batch auto-prompt to keep poses distinct
      // across the 4 generated images.
      prompts?: string[];
      targetSlot?: "headshot" | "turnaround";
      refMediaIds?: string[];
    },
  ): Promise<void>;

  refineImage(
    rfId: string,
    opts: { prompt: string; refMediaIds?: string[]; aspectRatio?: string },
  ): Promise<void>;

  cancelGeneration(rfId: string): void;
  clearError(): void;
}

// Walk the board to collect mediaIds of every upstream media-bearing node
// (character / image / visual_asset) feeding into this image-target node.
// All of these are passed to Flow as IMAGE_INPUT_TYPE_REFERENCE inputs so the
// new image is composed from them.
//
// Per-edge variant pinning: each edge from a multi-variant source
// remembers exactly WHICH variant feeds the downstream — stored on
// `edge.data.sourceVariantIdx`. Resolution rules per edge:
//   1. If the edge has a pinned `sourceVariantIdx` AND the source has
//      a `mediaIds[idx]` entry there → use it.
//   2. Else if the source has an active `mediaId` → use it
//      (single-variant case; or multi-variant where the user hasn't
//      pinned yet — variant 0 is the natural default).
//   3. Else if the source has a non-empty `mediaIds[]` → use index 0.
// One ref per edge means one Flow API call regardless of how many
// variants the upstream has — the user picks which variant feeds
// which downstream by clicking the variant tile (Stage 2 UX).
const REF_SOURCE_TYPES = new Set(["character", "image", "visual_asset", "Storyboard"]);

function collectUpstreamRefMediaIds(targetRfId: string): string[] {
  const { nodes, edges } = useBoardStore.getState();
  const ids: string[] = [];
  for (const e of edges) {
    if (e.target !== targetRfId) continue;
    const src = nodes.find((n) => n.id === e.source);
    if (!src || !REF_SOURCE_TYPES.has(src.data.type)) continue;

    if (src.data.type === "character") {
      const portrait = (src.data.portraitMediaId as string) || (src.data.mediaId as string);
      const turnaround = src.data.turnaroundMediaId as string;
      if (portrait && typeof portrait === "string" && !ids.includes(portrait)) {
        ids.push(portrait);
      }
      if (turnaround && typeof turnaround === "string" && !ids.includes(turnaround)) {
        ids.push(turnaround);
      }
      continue;
    }

    const variants = Array.isArray(src.data.mediaIds) ? src.data.mediaIds : [];
    const pinned = (e.data?.sourceVariantIdx ?? null) as number | null;

    let chosen: string | null = null;
    if (
      pinned !== null
      && pinned >= 0
      && pinned < variants.length
      && typeof variants[pinned] === "string"
      && variants[pinned]
    ) {
      chosen = variants[pinned] as string;
    } else if (typeof src.data.mediaId === "string" && src.data.mediaId) {
      chosen = src.data.mediaId;
    } else if (variants.length > 0 && typeof variants[0] === "string" && variants[0]) {
      chosen = variants[0] as string;
    }

    if (chosen && !ids.includes(chosen)) ids.push(chosen);
  }
  return ids;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  active: {},
  openDialog: { rfId: null, prompt: "" },
  openViewer: { rfId: null, idx: 0 },
  projectId: null,
  paygateTier: null,
  error: null,

  openGenerationDialog(rfId, prompt, opts) {
    set({ openDialog: { rfId, prompt, targetSlot: opts?.targetSlot } });
  },

  closeGenerationDialog() {
    set({ openDialog: { rfId: null, prompt: "", targetSlot: undefined } });
  },

  openResultViewer(rfId, idx = 0) {
    set({ openViewer: { rfId, idx } });
  },

  closeResultViewer() {
    set({ openViewer: { rfId: null, idx: 0 } });
  },

  async ensureProjectId() {
    const cached = get().projectId;
    if (cached !== null) return cached;
    const boardId = useBoardStore.getState().boardId;
    if (boardId === null) {
      set({ error: "no board loaded" });
      return null;
    }
    try {
      const proj = await ensureBoardProject(boardId);
      set({ projectId: proj.flow_project_id });
      return proj.flow_project_id;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  },

  async dispatchGeneration(rfId, opts: {
    prompt: string;
    aspectRatio?: string;
    paygateTier?: string;
    kind?: "image" | "video";
    sourceMediaId?: string;
    sourceMediaIds?: string[];
    variantCount?: number;
    prompts?: string[];
    targetSlot?: "headshot" | "turnaround";
    refMediaIds?: string[];
  }) {
    const projectId = await get().ensureProjectId();
    if (projectId === null) return;

    // Pre-flight: refuse to dispatch if the paygate tier is unknown.
    // The backend would reject with `paygate_tier_unknown` anyway (since
    // Phase 1 stopped silently defaulting to Pro), but bailing here gives
    // the user a clearer hint without spending a captcha round-trip and
    // without leaving a `failed` request row in the DB. The
    // AccountPanel's "Tier unknown — Open Flow" banner is the recovery
    // path.
    const knownTier = opts.paygateTier ?? get().paygateTier;
    if (!knownTier) {
      set({
        error: "Open Flow once so the extension can detect your plan, then retry. (See the Tier-unknown banner in the bottom-left.)",
      });
      useBoardStore.getState().updateNodeData(rfId, {
        status: "error",
        error: "paygate_tier_unknown",
      });
      return;
    }

    // Cancel existing poll for this node if any
    const existingEntry = get().active[rfId];
    if (existingEntry && existingEntry.timerId !== null) {
      clearTimeout(existingEntry.timerId);
    }

    // Optimistically update node
    const isTurnaround = opts.targetSlot === "turnaround";
    const variantCount = isTurnaround ? 1 : Math.max(1, Math.min(opts.variantCount ?? 1, 4));

    if (isTurnaround) {
      useBoardStore.getState().updateNodeData(rfId, {
        status: "running",
        turnaroundStatus: "running",
        error: undefined,
      });
    } else {
      useBoardStore.getState().updateNodeData(rfId, {
        status: "queued",
        prompt: opts.prompt,
        error: undefined,
        variantCount,
        mediaIds: undefined,
        mediaId: undefined,
      });
    }

    // Create request
    const kind = opts.kind ?? "image";
    let reqDto;
    try {
      const nodeDbId = parseInt(rfId, 10);
      if (kind === "video") {
        const settings = useSettingsStore.getState();
        const isOmni = settings.videoModel === "omni_flash";

        if (isOmni) {
          const ingredients = collectUpstreamRefMediaIds(rfId);
          if (ingredients.length === 0) {
            useBoardStore.getState().updateNodeData(rfId, {
              status: "error",
              error: "no ingredients",
            });
            set({
              error:
                "Omni Flash needs at least one ingredient (connect an upstream Character / Image / Visual asset).",
            });
            return;
          }
          reqDto = await createRequest({
            type: "gen_video_omni",
            node_id: isNaN(nodeDbId) ? undefined : nodeDbId,
            params: {
              prompt: opts.prompt,
              project_id: projectId,
              ref_media_ids: ingredients,
              duration_s: settings.omniFlashDuration,
              aspect_ratio: opts.aspectRatio ?? "VIDEO_ASPECT_RATIO_LANDSCAPE",
              paygate_tier:
                opts.paygateTier ?? get().paygateTier ?? "PAYGATE_TIER_ONE",
            },
          });
        } else {
          // Standard Veo i2v path.
          const hasMulti = Array.isArray(opts.sourceMediaIds) && opts.sourceMediaIds.length > 0;
          if (!hasMulti && !opts.sourceMediaId) {
            useBoardStore.getState().updateNodeData(rfId, { status: "error", error: "no source media" });
            set({ error: "Veo i2v requires a source image (connect an upstream image node)" });
            return;
          }
          const videoParams: Record<string, unknown> = {
            prompt: opts.prompt,
            project_id: projectId,
            aspect_ratio: opts.aspectRatio ?? "VIDEO_ASPECT_RATIO_LANDSCAPE",
            paygate_tier:
              opts.paygateTier ?? get().paygateTier ?? "PAYGATE_TIER_ONE",
            video_quality: settings.videoQuality,
          };
          if (hasMulti) {
            videoParams.start_media_ids = opts.sourceMediaIds;
          } else {
            videoParams.start_media_id = opts.sourceMediaId;
          }
          reqDto = await createRequest({
            type: "gen_video",
            node_id: isNaN(nodeDbId) ? undefined : nodeDbId,
            params: videoParams,
          });
        }
      } else {
        const upstreamRefs = collectUpstreamRefMediaIds(rfId);
        const explicitRefs = opts.refMediaIds ?? [];
        const combinedRefs = Array.from(new Set([...upstreamRefs, ...explicitRefs]));

        const params: Record<string, unknown> = {
          prompt: opts.prompt,
          project_id: projectId,
          aspect_ratio: opts.aspectRatio ?? "IMAGE_ASPECT_RATIO_LANDSCAPE",
          paygate_tier:
            opts.paygateTier ?? get().paygateTier ?? "PAYGATE_TIER_ONE",
          variant_count: variantCount,
          image_model: useSettingsStore.getState().imageModel,
        };
        if (combinedRefs.length > 0) {
          params.ref_media_ids = combinedRefs;
        }
        if (opts.prompts && opts.prompts.length > 0) {
          params.prompts = opts.prompts;
        }
        reqDto = await createRequest({
          type: "gen_image",
          node_id: isNaN(nodeDbId) ? undefined : nodeDbId,
          params,
        });
      }
    } catch (err) {
      useBoardStore.getState().updateNodeData(rfId, { status: "error", error: err instanceof Error ? err.message : "request failed" });
      set({ error: err instanceof Error ? err.message : "Generation failed" });
      return;
    }

    // Start polling
    const requestId = reqDto.id;
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes
    let networkRetries = 0;
    const MAX_NETWORK_RETRIES = 8;

    const scheduleNextPoll = () => {
      if (attempts >= maxAttempts) {
        useBoardStore.getState().updateNodeData(rfId, { status: "error", error: "Generation timed out" });
        set((s) => {
          const next = { ...s.active };
          delete next[rfId];
          return { active: next };
        });
        return;
      }
      attempts++;

      const timerId = setTimeout(async () => {
        if (get().active[rfId] === undefined) return;
        try {
          const req = await getRequest(requestId);
          networkRetries = 0;

          if (req.status === "running") {
            useBoardStore.getState().updateNodeData(rfId, { status: "running" });
            set((s) => ({
              active: {
                ...s.active,
                [rfId]: { requestId, timerId: null },
              },
            }));
            scheduleNextPoll();
          } else if (req.status === "done") {
            const mediaIds = (req.result["media_ids"] as (string | null)[] | undefined) ?? [];
            const mediaId = mediaIds.find(
              (m): m is string => typeof m === "string" && m.length > 0,
            );
            const partialError = (req.result["partial_error"] as string | undefined) ?? null;
            const slotErrors =
              (req.result["slot_errors"] as (string | null)[] | undefined) ?? null;
            const stampedImageModel =
              req.type === "gen_image"
                ? (req.params["image_model"] as string | undefined)
                : undefined;
            let stampedVideoQuality: string | undefined;
            if (req.type === "gen_video") {
              stampedVideoQuality = req.params["video_quality"] as
                | string
                | undefined;
            } else if (req.type === "gen_video_omni") {
              const d = req.params["duration_s"] as number | undefined;
              if (d === 4 || d === 6 || d === 8 || d === 10) {
                stampedVideoQuality = `abra_r2v_${d}s`;
              }
            }

            if (isTurnaround && mediaId) {
              useBoardStore.getState().updateNodeData(rfId, {
                status: "done",
                turnaroundMediaId: mediaId,
                turnaroundAspectRatio: opts.aspectRatio,
                turnaroundStatus: undefined,
                renderedAt: new Date().toISOString(),
                error: partialError ?? undefined,
              });
              const dbId = parseInt(rfId, 10);
              if (!isNaN(dbId)) {
                patchNode(dbId, {
                  status: "done",
                  data: {
                    turnaroundMediaId: mediaId,
                    turnaroundAspectRatio: opts.aspectRatio,
                    renderedAt: new Date().toISOString(),
                  },
                }).catch(() => {});
              }
            } else {
              useBoardStore.getState().updateNodeData(rfId, {
                status: "done",
                mediaId,
                portraitMediaId: mediaId,
                mediaIds,
                slotErrors: slotErrors ?? undefined,
                aiBrief: undefined,
                aspectRatio: opts.aspectRatio,
                renderedAt: new Date().toISOString(),
                error: partialError ?? undefined,
                ...(stampedImageModel ? { imageModel: stampedImageModel } : {}),
                ...(stampedVideoQuality ? { videoQuality: stampedVideoQuality } : {}),
              });
              const dbId = parseInt(rfId, 10);
              if (!isNaN(dbId) && mediaId) {
                const n = useBoardStore.getState().nodes.find((x) => x.id === rfId);
                const d = n?.data;
                patchNode(dbId, {
                  status: "done",
                  data: {
                    prompt: opts.prompt,
                    mediaId,
                    portraitMediaId: mediaId,
                    mediaIds,
                    slotErrors: slotErrors ?? null,
                    variantCount: d?.variantCount ?? mediaIds.length,
                    aiBrief: null,
                    aspectRatio: opts.aspectRatio,
                    renderedAt: new Date().toISOString(),
                    error: partialError ?? null,
                    ...(stampedImageModel ? { imageModel: stampedImageModel } : {}),
                    ...(stampedVideoQuality ? { videoQuality: stampedVideoQuality } : {}),
                  },
                }).catch(() => {});
              }
            }

            set((s) => {
              const next = { ...s.active };
              delete next[rfId];
              return { active: next };
            });
          } else if (req.status === "failed" || req.status === "timeout") {
            const errMsg =
              req.status === "timeout"
                ? `Timed out after 5 minutes (${req.error ?? "video_timeout"})`
                : (req.error ?? "unknown");
            useBoardStore.getState().updateNodeData(rfId, { status: "error", error: errMsg });
            set((s) => {
              const next = { ...s.active };
              delete next[rfId];
              return { active: next, error: errMsg };
            });
          } else if (req.status === "canceled") {
            useBoardStore.getState().updateNodeData(rfId, { status: "idle" });
            set((s) => {
              const next = { ...s.active };
              delete next[rfId];
              return { active: next };
            });
          } else {
            // queued — keep polling
            set((s) => ({
              active: {
                ...s.active,
                [rfId]: { requestId, timerId: null },
              },
            }));
            scheduleNextPoll();
          }
        } catch (err) {
          networkRetries += 1;
          if (networkRetries >= MAX_NETWORK_RETRIES) {
            const msg = err instanceof Error ? err.message : "network error";
            useBoardStore.getState().updateNodeData(rfId, { status: "error", error: msg });
            set((s) => {
              const next = { ...s.active };
              delete next[rfId];
              return { active: next, error: `Generation poll failed: ${msg}` };
            });
            return;
          }
          scheduleNextPoll();
        }
      }, 1500);

      set((s) => ({
        active: {
          ...s.active,
          [rfId]: { requestId, timerId },
        },
      }));
    };

    // Initialize active entry before first poll
    set((s) => ({
      active: {
        ...s.active,
        [rfId]: { requestId, timerId: null },
      },
    }));
    scheduleNextPoll();
  },

  async refineImage(rfId, opts) {
    const projectId = await get().ensureProjectId();
    if (projectId === null) return;

    const node = useBoardStore.getState().nodes.find((n) => n.id === rfId);
    const sourceMediaId = node?.data.mediaId;
    if (!sourceMediaId) {
      set({ error: "no source image to refine" });
      return;
    }

    const existing = get().active[rfId];
    if (existing && existing.timerId !== null) clearTimeout(existing.timerId);

    useBoardStore.getState().updateNodeData(rfId, {
      status: "queued",
      prompt: opts.prompt,
      error: undefined,
      variantCount: 1,
      mediaIds: undefined,
    });

    const nodeDbId = parseInt(rfId, 10);
    let reqDto;
    try {
      reqDto = await createRequest({
        type: "edit_image",
        node_id: isNaN(nodeDbId) ? undefined : nodeDbId,
        params: {
          prompt: opts.prompt,
          project_id: projectId,
          source_media_id: sourceMediaId,
          ref_media_ids: opts.refMediaIds ?? [],
          aspect_ratio: opts.aspectRatio ?? "IMAGE_ASPECT_RATIO_LANDSCAPE",
          paygate_tier: get().paygateTier ?? "PAYGATE_TIER_ONE",
          image_model: useSettingsStore.getState().imageModel,
        },
      });
    } catch (err) {
      useBoardStore.getState().updateNodeData(rfId, {
        status: "error",
        error: err instanceof Error ? err.message : "refine failed",
      });
      set({ error: err instanceof Error ? err.message : "refine failed" });
      return;
    }

    // Reuse the same poll loop by manually wiring active entry; copy-paste of
    // dispatchGeneration's poller would be loud, so we do a minimal wait here.
    const requestId = reqDto.id;
    set((s) => ({
      active: { ...s.active, [rfId]: { requestId, timerId: null } },
    }));

    const poll = async () => {
      try {
        const req = await getRequest(requestId);
        if (req.status === "running" || req.status === "queued") {
          useBoardStore.getState().updateNodeData(rfId, { status: req.status });
          const t = setTimeout(poll, 1500);
          set((s) => ({
            active: { ...s.active, [rfId]: { requestId, timerId: t } },
          }));
          return;
        }
        if (req.status === "done") {
          const mediaIds = (req.result["media_ids"] as string[] | undefined) ?? [];
          const mediaId = mediaIds[0];
          // edit_image still routes through the user's image model setting.
          const stampedImageModel = req.params["image_model"] as string | undefined;
          useBoardStore.getState().updateNodeData(rfId, {
            status: "done",
            mediaId,
            mediaIds,
            aspectRatio: opts.aspectRatio,
            renderedAt: new Date().toISOString(),
            ...(stampedImageModel ? { imageModel: stampedImageModel } : {}),
          });
          const dbId = parseInt(rfId, 10);
          if (!isNaN(dbId) && mediaId) {
            // Backend merges `data` — ship the new state including
            // prompt so it survives reload (regression fix: pre-Phase 20
            // the patchNode payload included prompt; the "only deltas"
            // refactor dropped it on the assumption prompt was already
            // persisted, but the dispatch flow never wrote it to backend).
            patchNode(dbId, {
              data: {
                prompt: opts.prompt,
                mediaId,
                mediaIds,
                variantCount: 1,
                aspectRatio: opts.aspectRatio,
                renderedAt: new Date().toISOString(),
                ...(stampedImageModel ? { imageModel: stampedImageModel } : {}),
              },
            }).catch(() => {});
          }
          set((s) => {
            const next = { ...s.active };
            delete next[rfId];
            return { active: next };
          });
          return;
        }
        if (req.status === "canceled") {
          useBoardStore.getState().updateNodeData(rfId, { status: "idle" });
          set((s) => {
            const next = { ...s.active };
            delete next[rfId];
            return { active: next };
          });
          return;
        }
        // failed | timeout — treat as a hard error on the node card so
        // the user sees something happened. 'timeout' is the auto-cancel
        // after the 5-minute video-gen budget; tag the message so the
        // user can tell auto-timeout apart from a real failure.
        const errMsg =
          req.status === "timeout"
            ? `Timed out after 5 minutes (${req.error ?? "video_timeout"})`
            : (req.error ?? "refine failed");
        useBoardStore.getState().updateNodeData(rfId, {
          status: "error",
          error: errMsg,
        });
        set((s) => {
          const next = { ...s.active };
          delete next[rfId];
          return { active: next, error: errMsg };
        });
      } catch (err) {
        const t = setTimeout(poll, 1500);
        set((s) => ({
          active: { ...s.active, [rfId]: { requestId, timerId: t } },
        }));
        console.warn("refine poll failed", err);
      }
    };
    setTimeout(poll, 800);
  },

  cancelGeneration(rfId) {
    const entry = get().active[rfId];
    if (entry && entry.timerId !== null) {
      clearTimeout(entry.timerId);
    }
    set((s) => {
      const next = { ...s.active };
      delete next[rfId];
      return { active: next };
    });
  },

  clearError() {
    set({ error: null });
  },
}));
