import { useEffect, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useBoardStore, type FlowboardNodeData, type FlowNode } from "../store/board";
import { useGenerationStore } from "../store/generation";
import {
  mediaUrl,
  patchEdge,
  patchNode,
  uploadImage,
  uploadImageFromUrl,
  listFlowVoices,
  getTurnaroundPrompt,
  syncFlowCharacter,
  type FlowVoice,
} from "../api/client";
import { requestAutoBrief } from "../api/autoBrief";
import { useReferencesStore } from "../store/references";
import {
  normaliseStoryboardGrid,
  resolveStoryboardLayout,
} from "../lib/storyboardPrompt";

const ICON: Record<string, string> = {
  character: "◎",
  image: "▣",
  video: "▶",
  prompt: "✦",
  note: "✎",
  visual_asset: "◇",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "transparent",
  queued: "rgba(245, 179, 1, 0.6)",
  running: "var(--accent)",
  done: "rgba(110, 231, 183, 0.8)",
  error: "#ef4444",
};

function StatusStrip({ status }: { status?: string }) {
  const color = STATUS_COLOR[status ?? "idle"] ?? "transparent";
  const isRunning = status === "running";
  return (
    <div
      className={isRunning ? "status-strip status-strip--running" : "status-strip"}
      style={{ background: color }}
    />
  );
}

const ACCEPT_MIME = "image/png,image/jpeg,image/webp,image/gif";

function BriefHint({ data }: { data: FlowboardNodeData }) {
  const brief = data.aiBrief;
  const status = data.aiBriefStatus;
  if (!brief && status !== "pending") return null;

  return (
    <div className="brief-hint" title={brief ?? "Reading visual content…"}>
      {status === "pending" ? (
        <span className="brief-hint__pending">Scanning visual…</span>
      ) : (
        <span className="brief-hint__text">{brief}</span>
      )}
    </div>
  );
}

function isLLMBusy(data: FlowboardNodeData): boolean {
  return (
    data.aiBriefStatus === "pending" ||
    data.autoPromptStatus === "pending"
  );
}

function CharacterBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  const portraitMediaId = (data.portraitMediaId as string) || (data.mediaId as string);
  const turnaroundMediaId = data.turnaroundMediaId as string | undefined;
  const currentVoiceId = (data.voiceId as string) || "";
  const isProcessing = data.status === "queued" || data.status === "running";

  const [uploadingHead, setUploadingHead] = useState(false);
  const [uploadingBody, setUploadingBody] = useState(false);
  const [generatingTurnaround, setGeneratingTurnaround] = useState(false);
  const [savingToLib, setSavingToLib] = useState(false);
  const [savedToLib, setSavedToLib] = useState(false);
  const [syncingFlow, setSyncingFlow] = useState(false);
  const [syncedFlow, setSyncedFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOverHead, setDragOverHead] = useState(false);
  const [dragOverBody, setDragOverBody] = useState(false);
  const [voices, setVoices] = useState<FlowVoice[]>([]);

  const headInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listFlowVoices().then(setVoices).catch(() => {});
  }, []);

  function persistPortrait(newMediaId: string, aspectRatio?: string) {
    useBoardStore.getState().updateNodeData(rfId, {
      mediaId: newMediaId,
      portraitMediaId: newMediaId,
      status: "done",
      aiBrief: undefined,
      aspectRatio,
    });
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId)) {
      patchNode(dbId, {
        status: "done",
        data: {
          mediaId: newMediaId,
          portraitMediaId: newMediaId,
          aiBrief: null,
          aspectRatio,
          renderedAt: new Date().toISOString(),
        },
      }).catch(() => {});
    }
    requestAutoBrief(rfId, newMediaId);
  }

  function persistTurnaround(newMediaId: string, aspectRatio?: string) {
    useBoardStore.getState().updateNodeData(rfId, {
      turnaroundMediaId: newMediaId,
      turnaroundAspectRatio: aspectRatio,
    });
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId)) {
      patchNode(dbId, {
        data: {
          turnaroundMediaId: newMediaId,
          turnaroundAspectRatio: aspectRatio,
          renderedAt: new Date().toISOString(),
        },
      }).catch(() => {});
    }
  }

  function setVoice(voiceId: string) {
    const v = voices.find((x) => x.id === voiceId);
    useBoardStore.getState().updateNodeData(rfId, {
      voiceId: voiceId || undefined,
      voiceGender: v?.gender,
      voiceLanguage: "vi-VN",
    });
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId)) {
      patchNode(dbId, {
        data: {
          voiceId: voiceId || null,
          voiceGender: v?.gender || null,
        },
      }).catch(() => {});
    }
  }

  async function uploadHead(file: File) {
    setError(null);
    setUploadingHead(true);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const dbId = parseInt(rfId, 10);
      const resp = await uploadImage(file, projectId, isNaN(dbId) ? undefined : dbId);
      persistPortrait(resp.media_id, resp.aspect_ratio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploadingHead(false);
    }
  }

  async function uploadBody(file: File) {
    setError(null);
    setUploadingBody(true);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const dbId = parseInt(rfId, 10);
      const resp = await uploadImage(file, projectId, isNaN(dbId) ? undefined : dbId);
      persistTurnaround(resp.media_id, resp.aspect_ratio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploadingBody(false);
    }
  }

  async function autoGenerateTurnaround() {
    setGeneratingTurnaround(true);
    setError(null);
    try {
      const res = await getTurnaroundPrompt({
        title: data.title,
        gender: data.charGender as string,
        vibe: data.charVibe as string,
        country: data.charCountry as string,
      });
      useGenerationStore.getState().openGenerationDialog(rfId, res.prompt, {
        targetSlot: "turnaround",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Turnaround prompt failed");
    } finally {
      setGeneratingTurnaround(false);
    }
  }

  function openGenerateHead() {
    useGenerationStore.getState().openGenerationDialog(rfId, data.prompt ?? "", {
      targetSlot: "headshot",
    });
  }

  const selectedVoice = voices.find((v) => v.id === currentVoiceId);

  return (
    <div className="node-body node-body--character">
      {/* ── Dual-Asset Grid: Headshot + 3-Angle Turnaround ── */}
      <div className="character-dual-grid">
        {/* Slot 1: Headshot */}
        <div
          className={`character-slot ${dragOverHead ? "character-slot--over" : ""} ${
            portraitMediaId ? "character-slot--has-media" : ""
          }`}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverHead(false);
            const f = e.dataTransfer.files?.[0];
            if (f) uploadHead(f);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragOverHead) setDragOverHead(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverHead(false);
          }}
        >
          <div className="character-slot__header">
            <div className="character-slot__title-group">
              <span className="character-slot__icon">◎</span>
              <span className="character-slot__label">Khuôn mặt</span>
            </div>
            <span className="character-slot__badge">1:1</span>
          </div>

          {portraitMediaId ? (
            <div
              className="character-slot__preview"
              onClick={() => headInputRef.current?.click()}
              title="Nhấp để thay ảnh chân dung"
            >
              <img
                className="character-slot__img"
                src={mediaUrl(portraitMediaId)}
                alt="Chân dung khuôn mặt"
              />
              <div className="character-slot__hover-overlay">
                <span>Thay ảnh</span>
              </div>
              {uploadingHead && <span className="character-drop__overlay">…</span>}
            </div>
          ) : (
            <div className="character-slot__empty">
              {isProcessing ? (
                <span className="visual-asset__hint">Đang sinh…</span>
              ) : (
                <div className="character-slot__actions">
                  <button
                    type="button"
                    className="character-btn character-btn--secondary"
                    onClick={() => headInputRef.current?.click()}
                    disabled={uploadingHead}
                  >
                    {uploadingHead ? "…" : "↑ Tải ảnh"}
                  </button>
                  <button
                    type="button"
                    className="character-btn character-btn--primary"
                    onClick={openGenerateHead}
                    disabled={uploadingHead}
                  >
                    ✦ Tạo mới
                  </button>
                </div>
              )}
            </div>
          )}
          <input
            ref={headInputRef}
            type="file"
            accept={ACCEPT_MIME}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadHead(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Slot 2: 3-Angle Turnaround Sheet */}
        <div
          className={`character-slot ${dragOverBody ? "character-slot--over" : ""} ${
            turnaroundMediaId ? "character-slot--has-media" : ""
          }`}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverBody(false);
            const f = e.dataTransfer.files?.[0];
            if (f) uploadBody(f);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragOverBody) setDragOverBody(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverBody(false);
          }}
        >
          <div className="character-slot__header">
            <div className="character-slot__title-group">
              <span className="character-slot__icon">▣</span>
              <span className="character-slot__label">Toàn thân 3 góc</span>
            </div>
            <span className="character-slot__badge">16:9</span>
          </div>

          {turnaroundMediaId ? (
            <div
              className="character-slot__preview character-slot__preview--turnaround"
              onClick={() => bodyInputRef.current?.click()}
              title="Nhấp để thay ảnh 3 góc"
            >
              <img
                className="character-slot__img character-slot__img--turnaround"
                src={mediaUrl(turnaroundMediaId)}
                alt="Toàn thân 3 góc máy"
              />
              <div className="character-slot__hover-overlay">
                <span>Thay ảnh</span>
              </div>
              {uploadingBody && <span className="character-drop__overlay">…</span>}
            </div>
          ) : (
            <div className="character-slot__empty">
              <div className="character-slot__actions">
                <button
                  type="button"
                  className="character-btn character-btn--secondary"
                  onClick={() => bodyInputRef.current?.click()}
                  disabled={uploadingBody}
                >
                  {uploadingBody ? "…" : "↑ Tải ảnh"}
                </button>
                <button
                  type="button"
                  className="character-btn character-btn--synth"
                  onClick={autoGenerateTurnaround}
                  disabled={generatingTurnaround || uploadingBody}
                  title="Sinh ảnh toàn thân 3 góc từ ảnh chân dung"
                >
                  {generatingTurnaround ? "…" : "✨ Sinh 3 góc"}
                </button>
              </div>
            </div>
          )}
          <input
            ref={bodyInputRef}
            type="file"
            accept={ACCEPT_MIME}
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadBody(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* ── Google Flow Voice Selector ── */}
      <div className="character-voice-box">
        <div className="character-voice-header">
          <div className="character-voice-header__left">
            <span className="character-voice-icon">🎙️</span>
            <span className="character-voice-title">Giọng Google Flow</span>
          </div>
          {selectedVoice && (
            <span
              className={`character-voice-pill character-voice-pill--${selectedVoice.gender}`}
            >
              {selectedVoice.gender === "female" ? "♀ Nữ" : "♂ Nam"}
            </span>
          )}
        </div>

        <div className="character-voice-select-wrapper">
          <select
            className="character-voice-select"
            value={currentVoiceId}
            onChange={(e) => setVoice(e.target.value)}
            aria-label="Chọn giọng cho nhân vật"
          >
            <option value="">-- Mặc định (Tự động) --</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.gender === "female" ? "♀" : "♂"} {v.name} — {v.vibe}
              </option>
            ))}
          </select>
          <span className="character-voice-select__arrow">▾</span>
        </div>

        {selectedVoice && (
          <div className="character-voice-details">
            <div className="character-voice-vibe-tag">{selectedVoice.vibe}</div>
            <p className="character-voice-desc">{selectedVoice.description}</p>
          </div>
        )}
      </div>

      <BriefHint data={data} />

      <div className="character-actions">
        {/* Google Flow Cast ID Direct Input */}
        <div className="character-flow-id-row" onClick={(e) => e.stopPropagation()}>
          <div className="character-flow-id-label">
            <span>Google Flow Cast ID:</span>
            {typeof data.flowCharacterId === "string" &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.flowCharacterId.trim()) && (
              <a
                href={`https://labs.google/fx/tools/flow/project/${useGenerationStore.getState().projectId || "active"}/character/${data.flowCharacterId.trim()}`}
                target="_blank"
                rel="noreferrer"
                className="character-flow-id-link"
                title="Mở nhân vật trên tab Google Flow"
              >
                ↗ Mở Flow
              </a>
            )}
          </div>
          <div className="character-flow-id-input-wrap">
            <input
              type="text"
              className="character-flow-id-input"
              value={data.flowCharacterId || ""}
              placeholder="Dán ID hoặc link Google Flow Character..."
              onChange={(e) => {
                const rawVal = e.target.value;
                const trimmed = rawVal.trim();
                const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                const resolvedId = uuidMatch ? uuidMatch[0] : trimmed;
                useBoardStore.getState().updateNodeData(rfId, { flowCharacterId: resolvedId });
                const dbId = parseInt(rfId, 10);
                if (!isNaN(dbId)) {
                  patchNode(dbId, { data: { flowCharacterId: resolvedId } }).catch(() => {});
                }
              }}
            />
            {data.flowCharacterId && (
              <button
                type="button"
                className="character-flow-id-clear-btn"
                onClick={() => {
                  useBoardStore.getState().updateNodeData(rfId, { flowCharacterId: "" });
                  const dbId = parseInt(rfId, 10);
                  if (!isNaN(dbId)) {
                    patchNode(dbId, { data: { flowCharacterId: "" } }).catch(() => {});
                  }
                }}
                title="Xóa ID này"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sync to Google Flow Cast Entity */}
        <button
          type="button"
          className={`character-sync-btn${syncingFlow ? " character-sync-btn--saving" : ""}${syncedFlow ? " character-sync-btn--saved" : ""}`}
          disabled={syncingFlow}
          onClick={async (e) => {
            e.stopPropagation();
            if (syncingFlow) return;
            setSyncingFlow(true);
            setError(null);
            try {
              const projectId = await useGenerationStore.getState().ensureProjectId();
              if (!projectId) {
                throw new Error("Chưa kết nối dự án Google Flow. Vui lòng mở Account Panel.");
              }
              const displayName =
                typeof data.title === "string" && data.title.trim()
                  ? data.title.trim()
                  : "Character";
              const res = await syncFlowCharacter({
                project_id: projectId,
                entity_id: data.flowCharacterId,
                node_id: parseInt(rfId, 10),
                display_name: displayName,
                portrait_media_id: (data.portraitWorkflowId as string) || portraitMediaId,
                turnaround_media_id: (data.turnaroundWorkflowId as string) || turnaroundMediaId,
                voice_name: (data.voiceId as string) || currentVoiceId,
                personality_notes: (data.prompt as string) || (typeof data.aiBrief === "string" ? data.aiBrief : ""),
              });
              useBoardStore.getState().updateNodeData(rfId, {
                flowCharacterId: res.entity_id,
              });
              const dbId = parseInt(rfId, 10);
              if (!isNaN(dbId)) {
                patchNode(dbId, {
                  data: { flowCharacterId: res.entity_id },
                }).catch(() => {});
              }
              setSyncedFlow(true);
              setTimeout(() => setSyncedFlow(false), 4000);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setSyncingFlow(false);
            }
          }}
          title={
            syncedFlow
              ? "Đã đồng bộ sang Google Flow Cast!"
              : "Đồng bộ Tên, Giọng nói và Personality sang đối tượng Google Flow Character"
          }
          aria-label="Sync to Google Flow"
        >
          <span className="character-sync-btn__icon">
            {syncingFlow ? "◌" : syncedFlow ? "✓" : "⚡"}
          </span>
          <span>
            {syncingFlow
              ? "Đang đồng bộ Google Flow..."
              : syncedFlow
              ? "✓ Đã đồng bộ sang Google Flow"
              : "Đồng bộ sang Google Flow"}
          </span>
        </button>

        {/* Save to local Reference Library */}
        {portraitMediaId && (
          <button
            type="button"
            className={`character-library-btn${savingToLib ? " character-library-btn--saving" : ""}${savedToLib ? " character-library-btn--saved" : ""}`}
            disabled={savingToLib}
            onClick={async (e) => {
              e.stopPropagation();
              if (savingToLib) return;
              setSavingToLib(true);
              try {
                const label =
                  typeof data.title === "string" && data.title.trim()
                    ? data.title.trim()
                    : typeof data.aiBrief === "string" && data.aiBrief.trim()
                    ? data.aiBrief.slice(0, 80)
                    : `#${data.shortId ?? "character"}`;
                await useReferencesStore.getState().save({
                  media_id: portraitMediaId,
                  kind: "character",
                  ai_brief: typeof data.aiBrief === "string" ? data.aiBrief : null,
                  label,
                  source_board_id: useBoardStore.getState().boardId ?? null,
                  source_node_short_id: typeof data.shortId === "string" ? data.shortId : null,
                });
                setSavedToLib(true);
                setTimeout(() => setSavedToLib(false), 3000);
              } catch {
                /* non-fatal */
              } finally {
                setSavingToLib(false);
              }
            }}
            title={savedToLib ? "Đã lưu vào Library!" : "Lưu ảnh chân dung nhân vật này vào Reference Library"}
            aria-label="Save to Reference Library"
          >
            <span className="character-library-btn__icon">
              {savingToLib ? "◌" : savedToLib ? "✓" : "★"}
            </span>
            <span>
              {savingToLib
                ? "Đang lưu vào Library..."
                : savedToLib
                ? "Đã lưu vào Library"
                : "Lưu vào Reference Library"}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="character-drop__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Reference-library save helpers ────────────────────────────────────────
//
// Maps a FlowboardNodeData.type → the `kind` enum stored on a Reference
// row. Storyboard nodes are containers — each saved tile is one *shot*
// of the board, so we use the "storyboard_shot" kind there to leave
// room for shot-specific UX in the library later (e.g. surfacing the
// shot index, or grouping by parent storyboard).
type ReferenceKind = "image" | "character" | "visual_asset" | "storyboard_shot";

function referenceKindFor(nodeType: string): ReferenceKind {
  if (nodeType === "Storyboard") return "storyboard_shot";
  if (nodeType === "character") return "character";
  if (nodeType === "visual_asset") return "visual_asset";
  return "image";
}

/** Fire-and-forget save of a tile's media into the reference library.
 * Errors surface via useReferencesStore.error; UI doesn't need to
 * await for the save to succeed before letting the user keep working. */
function saveTileToLibrary(opts: {
  mediaId: string;
  nodeType: string;
  data: FlowboardNodeData;
}) {
  const { mediaId, nodeType, data } = opts;
  const label =
    typeof data.aiBrief === "string" && data.aiBrief.trim().length > 0
      ? data.aiBrief.slice(0, 80)
      : `#${data.shortId}`;
  void useReferencesStore.getState().save({
    media_id: mediaId,
    kind: referenceKindFor(nodeType),
    ai_brief: typeof data.aiBrief === "string" ? data.aiBrief : null,
    aspect_ratio: typeof data.aspectRatio === "string" ? data.aspectRatio : null,
    label,
    source_board_id: useBoardStore.getState().boardId ?? null,
    source_node_short_id:
      typeof data.shortId === "string" ? data.shortId : null,
  });
}

const MAX_IMG_RETRIES = 5;

function tileCountFor(data: FlowboardNodeData): number {
  const fromVariants = data.variantCount;
  const fromMedia = data.mediaIds?.length;
  const n = fromVariants && fromVariants > 0 ? fromVariants : fromMedia ?? 1;
  return Math.max(1, Math.min(n, 4));
}

function ImageTile({
  rfId,
  mediaId,
  isProcessing,
  alt,
  onClick,
  onUseAsRef,
  onSaveToLibrary,
}: {
  rfId: string;
  mediaId: string | undefined;
  isProcessing: boolean;
  alt: string;
  onClick?: () => void;
  /** When provided, render an overlay button on hover that pins this
   * variant to a downstream edge and triggers Generate on the target.
   * The parent only sets this when the node has multi-variant output
   * AND has a downstream image/video target — keeps the affordance
   * scoped to cases where it actually does something. */
  onUseAsRef?: () => void;
  /** When provided, render a "★" overlay (top-right corner, opposite
   * the "Use →" affordance) that snapshots this tile's media + aiBrief
   * into the cross-board reference library. Parents only pass this when
   * the tile has a real mediaId — saving a placeholder makes no sense. */
  onSaveToLibrary?: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoaded(false);
    setAttempt(0);
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [mediaId, rfId]);

  if (!mediaId) {
    return (
      <div
        className={`thumbnail-tile${isProcessing ? " thumbnail-tile--processing" : ""}`}
        aria-hidden="true"
      >
        <span className="thumbnail-tile__icon">▣</span>
      </div>
    );
  }

  const givenUp = attempt >= MAX_IMG_RETRIES;
  const src = attempt > 0 ? `${mediaUrl(mediaId)}?retry=${attempt}` : mediaUrl(mediaId);
  const cls =
    `thumbnail-tile thumbnail-tile--filled` +
    (onClick ? " thumbnail-tile--clickable" : "");

  return (
    <div
      className={cls}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open variant ${alt}` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {!loaded && (
        <div className="thumbnail-tile__placeholder" aria-hidden="true" />
      )}
      {!givenUp && (
        <img
          key={attempt}
          className="thumbnail-tile__img"
          src={src}
          alt={alt}
          style={loaded ? undefined : { display: "none" }}
          onLoad={() => setLoaded(true)}
          onError={() => {
            retryTimerRef.current = setTimeout(() => {
              setAttempt((a) => a + 1);
            }, 2000);
          }}
        />
      )}
      {onUseAsRef && (
        // Overlay action — visible on hover via CSS. Stops propagation
        // so clicking the chip doesn't also trigger the tile's
        // openResultViewer. Title doubles as accessible label.
        <button
          type="button"
          className="thumbnail-tile__use-btn"
          onClick={(e) => {
            e.stopPropagation();
            onUseAsRef();
          }}
          title="Use this variant as the reference for a downstream node"
          aria-label="Use this variant as reference"
        >
          Use →
        </button>
      )}
      {onSaveToLibrary && (
        // ★ overlay — top-right corner, opposite the "Use →" chip in
        // the bottom-right. Fire-and-forget save into the cross-board
        // reference library. Same stopPropagation pattern so clicking
        // the star doesn't also open the result viewer.
        <button
          type="button"
          className="thumbnail-tile__save-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSaveToLibrary();
          }}
          title="Save this variant to the library"
          aria-label="Save to library"
        >
          ★
        </button>
      )}
    </div>
  );
}

// ── Variant-click → bind upstream variant to a downstream edge ───────────
//
// Workflow: user clicks "Use →" on a specific variant tile of an
// upstream multi-variant node. We find the downstream image/video
// targets connected to it, pin the chosen variant index on the right
// edge (PATCH /api/edges/{id}), refresh the local edge.data so the
// `v{N+1}` chip surfaces immediately, and then dispatch Generate on
// the target. One click → one pinned ref → one Flow API call.
//
// Multi-target case: when the upstream has 2+ outgoing edges to gen
// targets, we surface a small picker so the user disambiguates which
// downstream this variant should feed.

interface VariantTarget {
  edgeId: string;
  targetRfId: string;
  title: string;
  kind: "image" | "video";
  hasPrompt: boolean;
}

interface VariantPickerState {
  variantIdx: number;
  targets: VariantTarget[];
}

function collectGenTargets(srcRfId: string): VariantTarget[] {
  const { nodes, edges } = useBoardStore.getState();
  const out: VariantTarget[] = [];
  for (const e of edges) {
    if (e.source !== srcRfId) continue;
    const t = nodes.find((n) => n.id === e.target);
    if (!t) continue;
    if (t.data.type !== "image" && t.data.type !== "video") continue;
    out.push({
      edgeId: e.id,
      targetRfId: t.id,
      title: t.data.title || `#${t.data.shortId}`,
      kind: t.data.type as "image" | "video",
      hasPrompt: typeof t.data.prompt === "string" && t.data.prompt.trim().length > 0,
    });
  }
  return out;
}

async function applyVariantToTarget(variantIdx: number, target: VariantTarget) {
  const edgeDbId = parseInt(target.edgeId, 10);
  if (!isNaN(edgeDbId)) {
    try {
      const updated = await patchEdge(edgeDbId, {
        source_variant_idx: variantIdx,
      });
      useBoardStore.getState().updateEdgeData(target.edgeId, {
        sourceVariantIdx: updated.source_variant_idx,
      });
    } catch (err) {
      useGenerationStore.setState({
        error: `Couldn't pin variant: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
  }
  // If the target doesn't have a prompt yet, we open the GenerationDialog
  // instead of dispatching blind — the dialog gives the user the
  // auto-prompt path or a place to type. The pin we just persisted will
  // apply to whichever Generate is fired from the dialog.
  const targetNode = useBoardStore
    .getState()
    .nodes.find((n) => n.id === target.targetRfId);
  if (!targetNode) return;
  const prompt = (targetNode.data.prompt ?? "").trim();
  if (!prompt) {
    useGenerationStore.getState().openGenerationDialog(target.targetRfId, "");
    return;
  }
  await useGenerationStore.getState().dispatchGeneration(target.targetRfId, {
    prompt,
    kind: target.kind,
    aspectRatio: targetNode.data.aspectRatio,
    variantCount: targetNode.data.variantCount,
  });
}

function VariantPicker({
  state,
  onPick,
  onCancel,
}: {
  state: VariantPickerState;
  onPick(target: VariantTarget): void;
  onCancel(): void;
}) {
  return (
    <div className="variant-picker" role="dialog" aria-label="Pick downstream target">
      <div className="variant-picker__heading">
        Use variant v{state.variantIdx + 1} for:
      </div>
      <ul className="variant-picker__list">
        {state.targets.map((t) => (
          <li key={t.edgeId}>
            <button
              type="button"
              className="variant-picker__btn"
              onClick={() => onPick(t)}
            >
              {t.title}
              <span className="variant-picker__kind">
                {t.kind === "video" ? "video" : "image"}
                {!t.hasPrompt ? " · empty" : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="variant-picker__cancel"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}

function ImageBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  const tileCount = tileCountFor(data);
  const ids = data.mediaIds ?? (data.mediaId ? [data.mediaId] : []);
  const hasMedia = ids.length > 0;
  const isProcessing = data.status === "queued" || data.status === "running";

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Variant-picker state for the multi-downstream "Use →" flow. MUST be
  // declared above the empty-state early-return below — Rules of Hooks
  // require the same call order on every render, and the empty/filled
  // branches change which JSX renders but not which hooks run.
  const [picker, setPicker] = useState<VariantPickerState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function persistMedia(newMediaId: string, aspectRatio?: string) {
    useBoardStore.getState().updateNodeData(rfId, {
      mediaId: newMediaId,
      mediaIds: undefined,
      variantCount: 1,
      status: "done",
      aiBrief: undefined,
      aspectRatio,
    });
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId)) {
      // Backend merges `data`. `null` is the explicit "delete this key"
      // sentinel — used here to drop stale variant arrays + cached brief
      // when the user replaces a generated set with a single uploaded image.
      patchNode(dbId, {
        status: "done",
        data: {
          mediaId: newMediaId,
          mediaIds: null,
          variantCount: 1,
          aiBrief: null,
          aspectRatio,
          renderedAt: new Date().toISOString(),
        },
      }).catch(() => {});
    }
    requestAutoBrief(rfId, newMediaId);
  }

  async function uploadOwn(file: File) {
    setError(null);
    setUploading(true);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const dbId = parseInt(rfId, 10);
      const resp = await uploadImage(file, projectId, isNaN(dbId) ? undefined : dbId);
      persistMedia(resp.media_id, resp.aspect_ratio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPick() {
    fileInputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadOwn(f);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadOwn(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function openGenerate() {
    useGenerationStore.getState().openGenerationDialog(rfId, data.prompt ?? "");
  }

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPT_MIME}
      style={{ display: "none" }}
      onChange={onChange}
    />
  );

  // Empty state — same action-bar UX as character/visual_asset so users
  // can drop a reference image directly onto an image node instead of
  // having to wire one up via a separate visual_asset node.
  if (!hasMedia && !isProcessing) {
    return (
      <div
        className="node-body node-body--image"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className={`character-empty${dragOver ? " character-empty--over" : ""}`}>
          {dragOver ? (
            <span className="visual-asset__hint">Drop image</span>
          ) : (
            <>
              <button
                type="button"
                className="visual-asset__action"
                onClick={onPick}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button
                type="button"
                className="visual-asset__action"
                onClick={openGenerate}
                disabled={uploading}
              >
                Generate
              </button>
            </>
          )}
        </div>
        <BriefHint data={data} />
        {hiddenFileInput}
        {error && <p className="character-drop__error" role="alert">{error}</p>}
      </div>
    );
  }

  // Variant-click flow: when this node is multi-variant AND has a
  // downstream image/video target, each tile gets a "Use →" overlay
  // button. Clicking it pins this variant on the appropriate edge and
  // dispatches Generate on the target. See `applyVariantToTarget` above.
  const isMultiVariant = ids.length >= 2;

  function onUseVariantClick(variantIdx: number) {
    const targets = collectGenTargets(rfId);
    if (targets.length === 0) {
      useGenerationStore.setState({
        error: "Connect this image to a downstream image/video target first.",
      });
      return;
    }
    if (targets.length === 1) {
      void applyVariantToTarget(variantIdx, targets[0]);
      return;
    }
    setPicker({ variantIdx, targets });
  }

  const tiles: JSX.Element[] = [];
  for (let i = 0; i < tileCount; i++) {
    const rawMid = ids[i];
    const mid = typeof rawMid === "string" && rawMid ? rawMid : undefined;
    // Click a tile → open viewer at that variant. The "Use →" overlay
    // (when present) is a separate action handled by onUseAsRef.
    const onClick = mid
      ? () => useGenerationStore.getState().openResultViewer(rfId, i)
      : undefined;
    tiles.push(
      <ImageTile
        key={i}
        rfId={rfId}
        mediaId={mid}
        isProcessing={isProcessing && !mid}
        alt={data.title}
        onClick={onClick}
        onUseAsRef={
          isMultiVariant && mid && !isProcessing
            ? () => onUseVariantClick(i)
            : undefined
        }
        onSaveToLibrary={
          mid
            ? () =>
                saveTileToLibrary({
                  mediaId: mid,
                  nodeType: data.type,
                  data,
                })
            : undefined
        }
      />
    );
  }

  return (
    <div
      className={`node-body node-body--image${dragOver ? " node-body--image--over" : ""}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className={`thumbnail-grid thumbnail-grid--${tileCount}`}>
        {tiles}
      </div>
      {picker && (
        <VariantPicker
          state={picker}
          onPick={(target) => {
            void applyVariantToTarget(picker.variantIdx, target);
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      )}
      <BriefHint data={data} />
      {hiddenFileInput}
      {error && <p className="character-drop__error" role="alert">{error}</p>}
    </div>
  );
}

const MAX_VIDEO_RETRIES = 5;

function VideoTile({
  mediaId,
  posterMediaId,
  isProcessing,
  isError,
  slotError,
  alt,
  onClick,
}: {
  mediaId: string | undefined;
  // Upstream image's mediaId — used as the static poster so the tile
  // shows the source-image framing (subject centered, just like the
  // image-tile preview) instead of the video's frame-0 which often
  // catches a setup beat (ceiling, empty room) before the subject is
  // composed in.
  posterMediaId?: string | undefined;
  isProcessing: boolean;
  isError: boolean;
  // Per-slot error code (e.g. "PUBLIC_ERROR_UNSAFE_GENERATION") when
  // this specific variant got blocked by Veo's safety classifier. Only
  // surfaced for the partial-batch case so the tile can render a
  // distinctive ⚠ + tooltip instead of the generic empty placeholder.
  slotError?: string | null;
  alt: string;
  onClick?: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoaded(false);
    setAttempt(0);
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [mediaId]);

  const blockedTitle = slotError
    ? `Variant blocked: ${slotError} — click for details`
    : undefined;

  const placeholder = (
    <div
      className={`video-placeholder${isProcessing ? " video-placeholder--processing" : ""}${isError ? " video-placeholder--error" : ""}${slotError ? " video-placeholder--blocked" : ""}`}
      aria-hidden="true"
      title={blockedTitle}
    >
      {slotError ? (
        <>
          <span className="video-blocked-icon">⚠</span>
          <span className="video-blocked-label">Blocked</span>
        </>
      ) : (
        <>
          <span className="video-play">▶</span>
          <span className="video-duration">0:00</span>
        </>
      )}
    </div>
  );

  if (!mediaId) {
    // Pending / failed tile — just the placeholder. When `slotError` is
    // set the placeholder swaps to the warning treatment above. We
    // still attach onClick so the user can click through to the
    // detail viewer to read the full error.
    const cls = `video-tile${slotError ? " video-tile--blocked" : ""}${onClick ? " video-tile--clickable" : ""}`;
    return (
      <div
        className={cls}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={blockedTitle ?? (onClick ? `Open variant ${alt}` : undefined)}
        title={blockedTitle}
        onClick={onClick}
        onKeyDown={(e) => {
          if (!onClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {placeholder}
      </div>
    );
  }

  const givenUp = attempt >= MAX_VIDEO_RETRIES;
  const src = attempt > 0 ? `${mediaUrl(mediaId)}?retry=${attempt}` : mediaUrl(mediaId);
  const cls =
    `video-tile video-tile--filled` +
    (onClick ? " video-tile--clickable" : "");

  return (
    <div
      className={cls}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Open variant ${alt}` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {!loaded && placeholder}
      {!givenUp && posterMediaId ? (
        // Thumbnail = static poster image (the upstream i2v source).
        // Mounting a <video> here decodes frame 0 in Chrome and
        // overrides the poster attribute, which is what made every
        // tile display the video's setup beat (often empty ceiling)
        // instead of the subject-centered framing. The full video
        // with controls plays in the ResultViewer modal — clicking
        // a tile already routes there.
        <img
          key={`poster-${attempt}`}
          className="video-tile__poster"
          src={mediaUrl(posterMediaId)}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => {
            retryTimerRef.current = setTimeout(() => {
              setAttempt((a) => a + 1);
            }, 2000);
          }}
        />
      ) : !givenUp ? (
        // Fallback: no upstream poster available (orphan video node).
        // Mount the <video> directly with `preload="none"` so the
        // browser shows the bare frame instead of decoding frame 0.
        <video
          key={attempt}
          className="node-card__thumbnail"
          data-kind="video"
          src={src}
          preload="none"
          muted
          aria-label={alt}
          style={loaded ? undefined : { display: "none" }}
          onLoadedData={() => setLoaded(true)}
          onError={() => {
            retryTimerRef.current = setTimeout(() => {
              setAttempt((a) => a + 1);
            }, 2000);
          }}
        />
      ) : null}
      {posterMediaId && (
        <span className="video-tile__play-badge" aria-hidden="true">▶</span>
      )}
    </div>
  );
}

function VideoBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  const tileCount = tileCountFor(data);
  const ids = data.mediaIds ?? (data.mediaId ? [data.mediaId] : []);
  const isProcessing = data.status === "queued" || data.status === "running";
  const isError = data.status === "error";
  // Partial-batch case: status="done" + an error string means some
  // variants succeeded and others got blocked (filter / timeout).
  // Slot-level signal: `mediaIds[i] === null` is a positional
  // placeholder for a blocked variant — render the tile as filtered
  // rather than empty/processing.
  const isPartial = data.status === "done" && Boolean(data.error);

  // Resolve the upstream image used as the i2v source — its variants
  // become the per-tile poster so the static preview shows the same
  // subject-centered framing as the upstream image card. Multi-source
  // i2v: variant i of the video came from variant i of the upstream
  // image; single-source: every tile shares the same poster.
  const { nodes, edges } = useBoardStore.getState();
  const upstreamEdge = edges.find((e) => e.target === rfId);
  const upstreamNode = upstreamEdge
    ? nodes.find((n) => n.id === upstreamEdge.source)
    : undefined;
  const posterIds: (string | null)[] =
    upstreamNode?.data.mediaIds ??
    (upstreamNode?.data.mediaId ? [upstreamNode.data.mediaId] : []);

  const tiles: JSX.Element[] = [];
  for (let i = 0; i < tileCount; i++) {
    const rawMid = ids[i];
    const mid = typeof rawMid === "string" && rawMid ? rawMid : undefined;
    const slotError = data.slotErrors?.[i] ?? null;
    const slotBlocked = isPartial && rawMid === null;
    // Even blocked tiles get a click handler so the user can open the
    // detail viewer and read the full filter reason — without it the
    // tile is dead and the user has no way to understand why it's
    // empty.
    const onClick =
      mid || slotBlocked
        ? () => useGenerationStore.getState().openResultViewer(rfId, i)
        : undefined;
    // Pick the i-th source variant if available; fall back to the
    // first non-null source for single-source i2v where every video
    // shares it.
    const rawPoster = posterIds[i] ?? posterIds.find((p) => Boolean(p)) ?? null;
    const poster = typeof rawPoster === "string" ? rawPoster : undefined;
    tiles.push(
      <VideoTile
        key={i}
        mediaId={mid}
        posterMediaId={poster}
        isProcessing={isProcessing && !mid}
        isError={(isError && !mid) || slotBlocked}
        slotError={slotError}
        alt={data.title}
        onClick={onClick}
      />,
    );
  }

  return (
    <div className="node-body node-body--video">
      <div className={`video-grid video-grid--${tileCount}`}>
        {tiles}
      </div>
      {(isError || isPartial) && data.error && (
        <p
          className={`node-error${isPartial ? " node-error--partial" : ""}`}
          role={isError ? "alert" : "status"}
        >
          {data.error}
        </p>
      )}
    </div>
  );
}

function VisualAssetBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  const mediaId = data.mediaId;
  const isProcessing = data.status === "queued" || data.status === "running";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refRefreshKey, setRefRefreshKey] = useState(0);
  const [refMediaId, setRefMediaId] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  function persistMedia(newMediaId: string, aspectRatio?: string) {
    useBoardStore.getState().updateNodeData(rfId, {
      mediaId: newMediaId,
      mediaIds: [newMediaId],
      variantCount: 1,
      status: "done",
      aiBrief: undefined,
      aspectRatio,
    });
    const dbId = parseInt(rfId, 10);
    if (!isNaN(dbId)) {
      // Backend merges `data`, so we only need to send the deltas.
      // `null` clears aiBrief explicitly (undefined would be dropped
      // by JSON.stringify and leave the stale brief in place).
      patchNode(dbId, {
        status: "done",
        data: {
          mediaId: newMediaId,
          mediaIds: [newMediaId],
          variantCount: 1,
          aiBrief: null,
          aspectRatio,
          renderedAt: new Date().toISOString(),
        },
      }).catch(() => {});
    }
    requestAutoBrief(rfId, newMediaId);
  }

  async function uploadOwn(file: File) {
    setError(null);
    setUploading(true);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const dbId = parseInt(rfId, 10);
      const resp = await uploadImage(file, projectId, isNaN(dbId) ? undefined : dbId);
      persistMedia(resp.media_id, resp.aspect_ratio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function uploadFromLink(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    setUploading(true);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const dbId = parseInt(rfId, 10);
      const resp = await uploadImageFromUrl(
        trimmed,
        projectId,
        isNaN(dbId) ? undefined : dbId,
      );
      persistMedia(resp.media_id, resp.aspect_ratio);
      setLinkMode(false);
      setLinkValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "link upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function uploadRef(file: File) {
    setError(null);
    try {
      const projectId = await useGenerationStore.getState().ensureProjectId();
      if (!projectId) {
        setError("no project");
        return;
      }
      const resp = await uploadImage(file, projectId);
      setRefMediaId(resp.media_id);
      setRefRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ref upload failed");
    }
  }

  async function submitRefine() {
    if (!mediaId) return;
    if (!refinePrompt.trim()) return;
    await useGenerationStore.getState().refineImage(rfId, {
      prompt: refinePrompt.trim(),
      refMediaIds: refMediaId ? [refMediaId] : [],
    });
    setRefineOpen(false);
    setRefinePrompt("");
    setRefMediaId(null);
  }

  function openGenerate() {
    useGenerationStore.getState().openGenerationDialog(rfId, data.prompt ?? "");
  }

  if (!mediaId) {
    return (
      <div className="node-body node-body--visual-asset">
        <div
          className={`visual-asset__empty${isProcessing ? " visual-asset__empty--processing" : ""}`}
        >
          {isProcessing ? (
            <span className="visual-asset__hint">Generating…</span>
          ) : linkMode ? (
            <div className="visual-asset__link-row">
              <input
                type="url"
                className="visual-asset__link-input"
                placeholder="https://… (png/jpg/webp)"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") uploadFromLink(linkValue);
                  if (e.key === "Escape") {
                    setLinkMode(false);
                    setLinkValue("");
                    setError(null);
                  }
                }}
                disabled={uploading}
                autoFocus
              />
              <button
                type="button"
                className="visual-asset__action"
                onClick={() => uploadFromLink(linkValue)}
                disabled={uploading || !linkValue.trim()}
              >
                {uploading ? "Fetching…" : "Save"}
              </button>
              <button
                type="button"
                className="visual-asset__action"
                onClick={() => {
                  setLinkMode(false);
                  setLinkValue("");
                  setError(null);
                }}
                disabled={uploading}
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="visual-asset__action"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button
                type="button"
                className="visual-asset__action"
                onClick={() => {
                  setError(null);
                  setLinkMode(true);
                }}
                disabled={uploading}
              >
                Add link
              </button>
              <button
                type="button"
                className="visual-asset__action"
                onClick={openGenerate}
                disabled={uploading}
              >
                Generate
              </button>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadOwn(f);
            e.target.value = "";
          }}
        />
        {error && <p className="visual-asset__error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="node-body node-body--visual-asset node-body--visual-asset-with-media">
      <div className="visual-asset__media">
        <img
          className="visual-asset__image"
          src={mediaUrl(mediaId)}
          alt={data.title}
        />
        {!isProcessing && (
          <button
            type="button"
            className="visual-asset__refine-btn"
            onClick={() => setRefineOpen((o) => !o)}
            aria-label="Refine image"
          >
            Refine
          </button>
        )}
      </div>
      <BriefHint data={data} />
      {!isProcessing && (
        <button
          type="button"
          className="visual-asset__action"
          onClick={(e) => {
            e.stopPropagation();
            saveTileToLibrary({
              mediaId,
              nodeType: data.type,
              data,
            });
          }}
          title="Save this asset to the library"
          aria-label="Save to library"
        >
          ★ Save
        </button>
      )}
      {refineOpen && (
        <div className="visual-asset__refine-panel" role="region" aria-label="Refine">
          <textarea
            className="visual-asset__refine-textarea"
            placeholder="Describe the change…"
            rows={2}
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
          />
          <div className="visual-asset__refine-actions">
            <button
              type="button"
              className="visual-asset__refine-ref"
              onClick={() => refInputRef.current?.click()}
            >
              {refMediaId ? `Ref ✓ (${refRefreshKey})` : "Add ref"}
            </button>
            <button
              type="button"
              className="visual-asset__refine-submit"
              disabled={!refinePrompt.trim()}
              onClick={submitRefine}
            >
              Refine →
            </button>
          </div>
          <input
            ref={refInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadRef(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {error && <p className="visual-asset__error">{error}</p>}
    </div>
  );
}

// Shared editable body for prompt + note nodes. Both store free-form text
// in `data.prompt`; only display markup differs. Double-click swaps to a
// textarea; blur or Cmd/Ctrl+Enter saves; Esc cancels.
function EditableTextBody({
  rfId,
  data,
  variant,
}: {
  rfId: string;
  data: FlowboardNodeData;
  variant: "prompt" | "note";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.prompt ?? "");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(data.prompt ?? "");
      requestAnimationFrame(() => {
        const ta = taRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        }
      });
    }
  }, [editing]);

  function save() {
    const next = draft;
    if (next !== (data.prompt ?? "")) {
      useBoardStore.getState().updateNodeData(rfId, { prompt: next });
      const dbId = parseInt(rfId, 10);
      if (!isNaN(dbId)) {
        // Backend merges `data`, so only the prompt delta needs shipping.
        patchNode(dbId, { data: { prompt: next } }).catch(() => {});
      }
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className={`node-body node-body--${variant} node-body--${variant}-edit`}>
        <textarea
          ref={taRef}
          className={`${variant}-editor`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          placeholder={
            variant === "prompt"
              ? "Style direction (e.g. cinematic warm tone, magazine editorial mood). Connect into image/video to feed downstream auto-prompt."
              : "Note, TODO, label…"
          }
        />
      </div>
    );
  }

  const text = data.prompt ?? "";
  const placeholder =
    variant === "prompt"
      ? "Double-click to add direction…"
      : "Double-click to add note…";

  return (
    <div
      className={`node-body node-body--${variant}`}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to edit"
    >
      {variant === "prompt" ? (
        <pre className="prompt-text">{text || placeholder}</pre>
      ) : (
        <p className="note-text">{text || placeholder}</p>
      )}
    </div>
  );
}

// ── Storyboard ────────────────────────────────────────────────────────────
// Storyboard is a thin image-node wrapper. It dispatches via the standard
// `gen_image` handler with a locked prompt template that asks Flow to render
// the user's topic as a single composite NxN grid (see
// frontend/src/lib/storyboardPrompt.ts). Rendering reuses `ImageBody` — up
// to 4 composite variants in the tile grid — with a small `2×2`/`2×3`/`2×4`
// corner badge (flipped for portrait composites) reminding the user of
// the active layout.

function StoryboardBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  // Show the concrete rows × cols (post-orientation flip), not the
  // user-picker key. So a node with grid="2x3" on a portrait composite
  // shows "3×2" — matches what Flow actually rendered.
  const g = normaliseStoryboardGrid(data.storyboardGrid);
  const { rows, cols } = resolveStoryboardLayout(g, data.aspectRatio);
  const label = `${rows}×${cols}`;
  return (
    <div className="storyboard-wrap">
      <span
        className="storyboard-grid-badge"
        title={`Composite layout: ${label} (${rows * cols} panels)`}
      >
        {label}
      </span>
      <ImageBody rfId={rfId} data={data} />
    </div>
  );
}

function NodeBody({ rfId, data }: { rfId: string; data: FlowboardNodeData }) {
  switch (data.type) {
    case "character":
      return <CharacterBody rfId={rfId} data={data} />;
    case "image":
      return <ImageBody rfId={rfId} data={data} />;
    case "video":
      return <VideoBody rfId={rfId} data={data} />;
    case "prompt":
      return <EditableTextBody rfId={rfId} data={data} variant="prompt" />;
    case "note":
      return <EditableTextBody rfId={rfId} data={data} variant="note" />;
    case "visual_asset":
      return <VisualAssetBody rfId={rfId} data={data} />;
    case "Storyboard":
      return <StoryboardBody rfId={rfId} data={data} />;
  }
}

function downloadExt(type: string): string {
  if (type === "video") return "mp4";
  return "png";
}

export function NodeCard(props: NodeProps<FlowNode>) {
  const data = props.data;
  const isNote = data.type === "note";
  const isGenerable = ["image", "prompt", "video", "visual_asset", "character", "Storyboard"].includes(data.type);
  const isRunning = data.status === "running";
  const llmBusy = isLLMBusy(data);
  const downloadable = !!data.mediaId && data.type !== "prompt" && data.type !== "note";

  function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation();
    if (llmBusy) return; // guard: backend still composing for this node
    useGenerationStore.getState().openGenerationDialog(props.id, data.prompt ?? "");
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    // Download every variant, not just the first. `mediaIds` is the full
    // list — `mediaId` is just the active variant — so a 4-variant image
    // node was previously losing 3 of its 4 outputs. Filter out null
    // placeholders that the partial-batch path may leave in `mediaIds`.
    const rawIds =
      data.mediaIds && data.mediaIds.length > 0
        ? data.mediaIds
        : data.mediaId
          ? [data.mediaId]
          : [];
    const ids = rawIds.filter((m): m is string => typeof m === "string" && m.length > 0);
    if (ids.length === 0) return;
    const safeTitle = (data.title || data.type).replace(/[^A-Za-z0-9_-]+/g, "_");
    const ext = downloadExt(data.type);
    // `<a download>` only honours the suggested filename when the resource
    // is same-origin — `/media/<id>` *is* same-origin (proxied by FastAPI),
    // so the title-based filename sticks.
    ids.forEach((mid, i) => {
      const a = document.createElement("a");
      a.href = mediaUrl(mid);
      const suffix = ids.length > 1 ? `-${i + 1}` : "";
      a.download = `${safeTitle}-${data.shortId}${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  return (
    <div
      className={`node-card${isNote ? " node-card--note" : ""}${
        data.type === "character" ? " node-card--character" : ""
      }${props.selected ? " node-card--selected" : ""}${
        llmBusy ? " node-card--llm-busy" : ""
      }`}
    >
      <StatusStrip status={data.status} />
      <Handle type="target" position={Position.Left} className="node-handle" />

      <div className="node-header">
        <span className="node-icon" aria-hidden="true">{ICON[data.type] ?? "□"}</span>
        <span className="node-title">{data.title}</span>
        {llmBusy && (
          // Compact pill so the busy state reads at a glance even if the
          // body is collapsed. Title is contextual: composing vs. analysing.
          <span className="node-header__llm-pill" aria-live="polite">
            <span className="node-header__llm-spinner" aria-hidden="true" />
            {data.autoPromptStatus === "pending" ? "Composing…" : "Analyzing…"}
          </span>
        )}
        <div className="node-header__actions">
          {downloadable && (
            <button
              className="node-header__btn"
              onClick={handleDownload}
              aria-label="Download media"
              title="Download"
              tabIndex={0}
            >
              ⬇
            </button>
          )}
          {isGenerable && (
            <button
              className={`node-header__btn${isRunning ? " node-header__btn--running" : ""}`}
              onClick={handleGenerate}
              aria-label="Generate from this node"
              title={llmBusy ? "Backend is still composing — try again in a moment" : "Generate"}
              tabIndex={0}
              disabled={llmBusy}
            >
              ▶
            </button>
          )}
        </div>
        <span className="node-short-id">#{data.shortId}</span>
      </div>

      <NodeBody rfId={props.id} data={data} />

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}
