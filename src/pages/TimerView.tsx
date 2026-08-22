import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { useApp } from "../context/AppContext";
import { DurationSelector } from "../components/DurationSelector";
import { FocusHeatmap } from "../components/FocusHeatmap";
import { Oven, type OvenStatus } from "../components/Oven";
import { PastrySelector } from "../components/PastrySelector";
import { PastryVisual } from "../components/PastryVisual";
import { SessionSummaryModal } from "../components/SessionSummaryModal";
import { TagSelector } from "../components/TagSelector";
import { pastries } from "../data/pastries";
import { DEFAULT_TAGS, findTagById } from "../data/tags";
import { trackEvent } from "../services/analytics";
import type { AppState, StudyTag } from "../types";
import { isPastryVisible } from "../utils/season";
import { calculateCoins, formatMinutes } from "../utils/sessionUtils";
import { getHeatmapWeeks } from "../utils/statsUtils";

type TimerPhase =
  | "setup"
  | "active"
  | "paused"
  | "ready"
  | "success"
  | "expired";

type SessionSummary = {
  minutes: number;
  coins: number;
  pastryId: string;
  pastryName: string;
  pastryEmoji: string;
};

type TimerViewProps = {
  state: AppState;
  onCancelSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void | Promise<void>;
  onCompleteSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void;
  onSelectPastry: (pastryId: string) => void;
  onTagsChange: (tags: StudyTag[]) => void;
};

export function TimerView({
  state,
  onCancelSession,
  onCompleteSession,
  onSelectPastry,
  onTagsChange,
}: TimerViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { registerSessionGuard } = useApp();
  const [duration, setDuration] = useState(25);
  const [selectedTagId, setSelectedTagId] = useState(DEFAULT_TAGS[0].id);
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [startedAt, setStartedAt] = useState("");
  const [sessionPastryId, setSessionPastryId] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [targetEndMs, setTargetEndMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60);
  const cancelSessionButtonRef = useRef<HTMLButtonElement>(null);
  const activeSessionRef = useRef<{
    duration: number;
    pastryId: string;
    startedAt: string;
    tag: StudyTag;
  } | null>(null);
  const finalizedRef = useRef(false);
  const phaseRef = useRef<TimerPhase>("setup");
  const onCancelSessionRef = useRef(onCancelSession);
  const onCompleteSessionRef = useRef(onCompleteSession);
  const remainingSecondsRef = useRef(duration * 60);
  const selectedPastry =
    pastries.find((pastry) => pastry.id === state.selectedPastryId) ??
    pastries[0];
  const bakingPastry =
    pastries.find((pastry) => pastry.id === sessionPastryId) ?? selectedPastry;
  const fallbackTag = state.tags[0] ?? DEFAULT_TAGS[0];
  const selectedTag =
    findTagById(state.tags, selectedTagId) ?? fallbackTag;
  // Deliberately not rounded: the bar animates between ticks, so a whole-number
  // percentage made it jump a step at a time. The Oven rounds it for the label.
  const progress =
    ((duration * 60 - remainingSeconds) / (duration * 60)) * 100;
  const coinReward = calculateCoins(duration);
  const reward = t("timer.coinReward", { count: coinReward });
  const completedMinutes = state.completedSessions.reduce(
    (total, session) => total + session.durationMinutes,
    0,
  );
  const pastriesBaked = state.completedSessions.length;
  const streakCount = state.user?.streakCount ?? 0;
  // Hide out-of-season pastries from the picker unless the player owns them.
  const visiblePastries = pastries.filter((pastry) =>
    isPastryVisible(pastry, state.unlockedPastryIds),
  );
  const hasFocusHistory = pastriesBaked > 0;
  const focusHeatmap = getHeatmapWeeks(state.completedSessions, 13);

  useEffect(() => {
    onCancelSessionRef.current = onCancelSession;
    onCompleteSessionRef.current = onCompleteSession;
  }, [onCancelSession, onCompleteSession]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // Block in-app navigation (incl. browser back/forward) while a bake runs.
  // On confirm we just proceed, the unmount cleanup expires the pastry.
  const blocker = useBlocker(phase === "active" || phase === "paused");

  // While a bake runs, hand the shell a finaliser it can await before signing
  // out, so the pastry is expired and logged while the user is still
  // authenticated (after sign-out the Firestore write would be rejected).
  useEffect(() => {
    if (phase !== "active" && phase !== "paused") {
      registerSessionGuard(null);
      return;
    }

    registerSessionGuard(async () => {
      const activeSession = activeSessionRef.current;

      if (!activeSession || finalizedRef.current) {
        return;
      }

      finalizedRef.current = true;
      activeSessionRef.current = null;
      await onCancelSessionRef.current(
        activeSession.tag,
        activeSession.duration,
        activeSession.startedAt,
        activeSession.pastryId,
      );
      phaseRef.current = "expired";
      setPhase("expired");
    });

    return () => registerSessionGuard(null);
  }, [phase, registerSessionGuard]);

  useEffect(() => {
    if (!findTagById(state.tags, selectedTagId)) {
      setSelectedTagId(fallbackTag.id);
    }
  }, [fallbackTag.id, selectedTagId, state.tags]);

  useEffect(() => {
    if (phase !== "active" || targetEndMs === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((targetEndMs - Date.now()) / 1000),
      );

      remainingSecondsRef.current = nextRemainingSeconds;
      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        window.clearInterval(interval);
        phaseRef.current = "ready";
        setPhase("ready");
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [phase, targetEndMs]);

  useEffect(() => {
    if (phase !== "active" && phase !== "paused") {
      setShowCancelConfirm(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "active" && phase !== "paused") {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue =
        "Your pastry may expire if you leave during an unfinished session.";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") {
      return;
    }

    const timeout = window.setTimeout(() => {
      completeSession();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [phase]);

  // Expired sessions bounce back to the dashboard on their own. A successful
  // bake instead waits on the summary modal, which navigates when dismissed.
  useEffect(() => {
    if (phase !== "expired") {
      return;
    }

    const timeout = window.setTimeout(() => navigate("/dashboard"), 1400);

    return () => window.clearTimeout(timeout);
  }, [navigate, phase]);

  useEffect(() => {
    return () => {
      const activeSession = activeSessionRef.current;

      if (!activeSession || finalizedRef.current) {
        return;
      }

      finalizedRef.current = true;
      activeSessionRef.current = null;

      if (phaseRef.current === "ready") {
        onCompleteSessionRef.current(
          activeSession.tag,
          activeSession.duration,
          activeSession.startedAt,
          activeSession.pastryId,
        );
        return;
      }

      if (phaseRef.current === "active" || phaseRef.current === "paused") {
        onCancelSessionRef.current(
          activeSession.tag,
          activeSession.duration,
          activeSession.startedAt,
          activeSession.pastryId,
        );
      }
    };
  }, []);

  function changeDuration(nextDuration: number) {
    setDuration(Math.min(120, Math.max(10, nextDuration)));
  }

  function startSession() {
    const start = new Date();
    const nextStartedAt = start.toISOString();
    const nextTargetEndMs = start.getTime() + duration * 60 * 1000;

    finalizedRef.current = false;
    activeSessionRef.current = {
      duration,
      pastryId: selectedPastry.id,
      startedAt: nextStartedAt,
      tag: selectedTag,
    };
    setStartedAt(nextStartedAt);
    setSessionPastryId(selectedPastry.id);
    setTargetEndMs(nextTargetEndMs);
    setRemainingSeconds(duration * 60);
    remainingSecondsRef.current = duration * 60;
    phaseRef.current = "active";
    setPhase("active");
    trackEvent("bake_started", {
      durationMinutes: duration,
      pastryId: selectedPastry.id,
      tagId: selectedTag.id,
    });
  }

  function changeTags(nextTags: StudyTag[]) {
    if (nextTags.length === 0) {
      return;
    }

    if (!findTagById(nextTags, selectedTagId)) {
      setSelectedTagId(nextTags[0].id);
    }

    onTagsChange(nextTags);
  }

  function finishSession() {
    if (phase !== "ready") {
      return;
    }

    completeSession();
  }

  function pauseSession() {
    if (phaseRef.current !== "active") {
      return;
    }

    const nextRemainingSeconds = Math.max(
      0,
      Math.ceil((targetEndMs - Date.now()) / 1000),
    );

    remainingSecondsRef.current = nextRemainingSeconds;
    setRemainingSeconds(nextRemainingSeconds);

    if (nextRemainingSeconds === 0) {
      phaseRef.current = "ready";
      setPhase("ready");
      return;
    }

    phaseRef.current = "paused";
    setPhase("paused");
  }

  function resumeSession() {
    if (phaseRef.current !== "paused") {
      return;
    }

    if (remainingSecondsRef.current <= 0) {
      phaseRef.current = "ready";
      setPhase("ready");
      return;
    }

    setTargetEndMs(Date.now() + remainingSecondsRef.current * 1000);
    phaseRef.current = "active";
    setPhase("active");
  }

  function requestCancelSession() {
    if (phase !== "active" && phase !== "paused") {
      return;
    }

    setShowCancelConfirm(true);
  }

  function keepBaking() {
    setShowCancelConfirm(false);
    window.requestAnimationFrame(() => cancelSessionButtonRef.current?.focus());
  }

  function throwAwayPastry() {
    setShowCancelConfirm(false);
    expireSession();
  }

  function expireSession() {
    if (phaseRef.current !== "active" && phaseRef.current !== "paused") {
      return;
    }

    const activeSession = activeSessionRef.current;

    finalizedRef.current = true;
    activeSessionRef.current = null;
    onCancelSessionRef.current(
      activeSession?.tag ?? selectedTag,
      activeSession?.duration ?? duration,
      (activeSession?.startedAt ?? startedAt) || new Date().toISOString(),
      activeSession?.pastryId ?? selectedPastry.id,
    );
    phaseRef.current = "expired";
    setPhase("expired");
  }

  function completeSession() {
    const activeSession = activeSessionRef.current;

    if (!activeSession || finalizedRef.current) {
      return;
    }

    finalizedRef.current = true;
    activeSessionRef.current = null;
    onCompleteSessionRef.current(
      activeSession.tag,
      activeSession.duration,
      activeSession.startedAt,
      activeSession.pastryId,
    );

    const summaryPastry =
      pastries.find((pastry) => pastry.id === activeSession.pastryId) ??
      selectedPastry;
    setSummary({
      minutes: activeSession.duration,
      coins: calculateCoins(activeSession.duration),
      pastryId: summaryPastry.id,
      pastryName: summaryPastry.name,
      pastryEmoji: summaryPastry.emoji,
    });
    phaseRef.current = "success";
    setPhase("success");
  }

  function dismissSummary() {
    setSummary(null);
    navigate("/dashboard");
  }

  if (phase !== "setup") {
    const ovenStatus: OvenStatus =
      phase === "active"
        ? "active"
        : phase === "paused"
          ? "paused"
        : phase === "expired"
          ? "expired"
          : "completed";

    return (
      <div className="timer-layout active-timer-layout">
        <section
          className="page-card oven-card"
          aria-label={t("timer.activeTimerAria")}
        >
          <div className="session-heading">
            <div className="session-heading__main">
              <PastryVisual
                className="session-heading__visual"
                emoji={bakingPastry.emoji}
                pastryId={bakingPastry.id}
                pastryName={bakingPastry.name}
              />
              <h1>
                {phase === "success"
                  ? t("timer.headingSuccess")
                  : phase === "expired"
                    ? t("timer.headingExpired")
                    : phase === "paused"
                      ? t("timer.headingPaused")
                      : t("timer.headingActive")}
              </h1>
            </div>
            <div className="session-heading__details">
              <p>
                {t("timer.detailLine", {
                  pastry: bakingPastry.name,
                  minutes: duration,
                  tag: selectedTag.name,
                })}
              </p>
              <p className="reward-note">
                {phase === "expired"
                  ? t("timer.rewardNotEarned", { reward })
                  : phase === "success"
                    ? t("timer.rewardSaved", { reward })
                    : t("timer.rewardComplete", { reward })}
              </p>
            </div>
          </div>

          <Oven
            pastryEmoji={bakingPastry.emoji}
            pastryId={bakingPastry.id}
            pastryName={bakingPastry.name}
            progressPercent={phase === "success" ? 100 : progress}
            status={ovenStatus}
            timeLabel={
              phase === "success"
                ? t("timer.timeDone")
                : phase === "expired"
                  ? t("timer.timeStopped")
                : formatTime(remainingSeconds)
            }
          />

          {phase === "ready" && (
            <p className="setup-ready">{t("timer.readyMsg")}</p>
          )}
          {phase === "success" && (
            <p className="setup-ready">{t("timer.successMsg")}</p>
          )}
          {phase === "paused" && (
            <p className="setup-paused">{t("timer.pausedMsg")}</p>
          )}
          {phase === "expired" && (
            <p className="setup-expired">{t("timer.expiredMsg")}</p>
          )}

          <p className="timer-action-help" id="finish-session-help">
            {phase === "ready"
              ? t("timer.finishHelpReady")
              : t("timer.finishHelpWaiting")}
          </p>

          <div className="timer-action-row">
            <button
              aria-describedby="finish-session-help"
              className="button primary"
              disabled={phase !== "ready"}
              onClick={finishSession}
              type="button"
            >
              {t("timer.finishSession")}
            </button>
            <button
              aria-label={
                phase === "paused" ? t("timer.resumeAria") : t("timer.pauseAria")
              }
              className="button pause-button"
              disabled={phase !== "active" && phase !== "paused"}
              onClick={phase === "paused" ? resumeSession : pauseSession}
              type="button"
            >
              <i
                aria-hidden="true"
                className={
                  phase === "paused" ? "fa-solid fa-play" : "fa-solid fa-pause"
                }
              />
              <span>{phase === "paused" ? t("timer.resume") : t("timer.pause")}</span>
            </button>
            <button
              className="button danger"
              disabled={phase !== "active" && phase !== "paused"}
              onClick={requestCancelSession}
              ref={cancelSessionButtonRef}
              type="button"
            >
              {t("timer.cancelSession")}
            </button>
          </div>

          {showCancelConfirm && (
            <ConfirmationModal
              cancelLabel={t("timer.keepBaking")}
              confirmLabel={t("timer.throwAway")}
              message={t("timer.confirmCancelMsg")}
              onCancel={keepBaking}
              onConfirm={throwAwayPastry}
              title={t("timer.confirmCancelTitle")}
            />
          )}

          {blocker.state === "blocked" && (
            <ConfirmationModal
              cancelLabel={t("timer.stayBaking")}
              confirmLabel={t("timer.leaveExpire")}
              message={t("timer.blockerMsg")}
              onCancel={() => blocker.reset?.()}
              onConfirm={() => blocker.proceed?.()}
              title={t("timer.blockerTitle")}
            />
          )}

          {summary && (
            <SessionSummaryModal onClose={dismissSummary} summary={summary} />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="timer-layout">
      <section className="page-card timer-setup-card">
        <div>
          <p className="quiet-text">{t("timer.setupQuiet")}</p>
          <h1>{t("timer.prepareTitle")}</h1>
          <p>{t("timer.prepareBody")}</p>
        </div>

        <DurationSelector duration={duration} onChange={changeDuration} />

        <TagSelector
          onChange={setSelectedTagId}
          onTagsChange={changeTags}
          selectedTagId={selectedTag.id}
          tags={state.tags}
        />

        <PastrySelector
          onSelect={onSelectPastry}
          pastries={visiblePastries}
          selectedPastryId={selectedPastry.id}
          unlockedPastryIds={state.unlockedPastryIds}
        />

        <button className="button primary" onClick={startSession} type="button">
          {t("timer.startBaking")}
        </button>
      </section>

      <div className="timer-setup-aside">
        <section
          className="page-card oven-card"
          aria-label={t("timer.selectedPreviewAria")}
        >
          <div className="selected-bake-preview">
            <PastryVisual
              className="selected-bake-preview__visual"
              emoji={selectedPastry.emoji}
              pastryId={selectedPastry.id}
              pastryName={selectedPastry.name}
            />
            <div>
              <h2>{selectedPastry.name}</h2>
              <p>
                {t("timer.selectedForLine", {
                  minutes: duration,
                  tag: selectedTag.name.toLowerCase(),
                  reward,
                })}
              </p>
            </div>
          </div>
          <Oven
            pastryEmoji={selectedPastry.emoji}
            pastryId={selectedPastry.id}
            pastryName={selectedPastry.name}
            progressPercent={0}
            status="idle"
            timeLabel={`${duration}:00`}
          />
        </section>

        <section
          className="page-card timer-progress-card"
          aria-label={t("timer.progressAria")}
        >
          <div className="section-title-row">
            <h2>{t("timer.progressTitle")}</h2>
          </div>
          <dl className="timer-progress-stats">
            <div>
              <dt>{t("timer.progressFocus")}</dt>
              <dd>{formatMinutes(completedMinutes)}</dd>
            </div>
            <div>
              <dt>{t("timer.progressBakes")}</dt>
              <dd>{pastriesBaked}</dd>
            </div>
            <div>
              <dt>{t("timer.progressStreak")}</dt>
              <dd>{t("dashboard.dayCount", { count: streakCount })}</dd>
            </div>
          </dl>
          {hasFocusHistory ? (
            <FocusHeatmap data={focusHeatmap} />
          ) : (
            <p className="timer-progress-empty">{t("timer.progressEmpty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
