import { useEffect, useRef, useState } from "react";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { DurationSelector } from "../components/DurationSelector";
import { Oven, type OvenStatus } from "../components/Oven";
import { PastrySelector } from "../components/PastrySelector";
import { PastryVisual } from "../components/PastryVisual";
import { TagSelector } from "../components/TagSelector";
import { pastries } from "../data/pastries";
import { studyTags } from "../data/tags";
import type { AppState, AudioSettings, StudyTag, View } from "../types";
import { calculateCoins } from "../utils/sessionUtils";

type TimerPhase = "setup" | "active" | "ready" | "success" | "expired";

type TimerViewProps = {
  state: AppState;
  onCancelSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void;
  onCompleteSession: (
    tag: StudyTag,
    durationMinutes: number,
    startedAt: string,
    pastryId: string,
  ) => void;
  onAudioSettingsChange: (audioSettings: AudioSettings) => void;
  onNavigate: (view: View) => void;
  onSelectPastry: (pastryId: string) => void;
};

export function TimerView({
  state,
  onCancelSession,
  onCompleteSession,
  onAudioSettingsChange,
  onNavigate,
  onSelectPastry,
}: TimerViewProps) {
  const [duration, setDuration] = useState(25);
  const [tag, setTag] = useState<StudyTag>("Study");
  const [phase, setPhase] = useState<TimerPhase>("setup");
  const [startedAt, setStartedAt] = useState("");
  const [sessionPastryId, setSessionPastryId] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [targetEndMs, setTargetEndMs] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(duration * 60);
  const cancelSessionButtonRef = useRef<HTMLButtonElement>(null);
  const activeSessionRef = useRef<{
    duration: number;
    pastryId: string;
    startedAt: string;
    tag: StudyTag;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finalizedRef = useRef(false);
  const phaseRef = useRef<TimerPhase>("setup");
  const onCancelSessionRef = useRef(onCancelSession);
  const onCompleteSessionRef = useRef(onCompleteSession);
  const onNavigateRef = useRef(onNavigate);
  const selectedPastry =
    pastries.find((pastry) => pastry.id === state.selectedPastryId) ??
    pastries[0];
  const bakingPastry =
    pastries.find((pastry) => pastry.id === sessionPastryId) ?? selectedPastry;
  const progress = Math.round(
    ((duration * 60 - remainingSeconds) / (duration * 60)) * 100,
  );
  const coinReward = calculateCoins(duration);
  const soundVolume = clampSoundVolume(state.audioSettings.soundVolume);

  useEffect(() => {
    onCancelSessionRef.current = onCancelSession;
    onCompleteSessionRef.current = onCompleteSession;
    onNavigateRef.current = onNavigate;
  }, [onCancelSession, onCompleteSession, onNavigate]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const audio = new Audio("/sounds/oven-loop.mp3");

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.4;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.volume = soundVolume / 100;
    }
  }, [soundVolume]);

  useEffect(() => {
    if (phase === "active" && state.audioSettings.soundEnabled) {
      playOvenSound();
      return;
    }

    stopOvenSound();
  }, [phase, soundVolume, state.audioSettings.soundEnabled]);

  useEffect(() => {
    if (phase !== "active" || targetEndMs === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((targetEndMs - Date.now()) / 1000),
      );

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
    if (phase !== "active") {
      setShowCancelConfirm(false);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "active") {
      return;
    }

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue =
        "Your pastry may expire if you leave during an active session.";
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

  useEffect(() => {
    if (phase !== "success" && phase !== "expired") {
      return;
    }

    const timeout = window.setTimeout(
      () => onNavigateRef.current("dashboard"),
      1200,
    );

    return () => window.clearTimeout(timeout);
  }, [phase]);

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

      if (phaseRef.current === "active") {
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
      tag,
    };
    setStartedAt(nextStartedAt);
    setSessionPastryId(selectedPastry.id);
    setTargetEndMs(nextTargetEndMs);
    setRemainingSeconds(duration * 60);
    phaseRef.current = "active";
    playOvenSound();
    setPhase("active");
  }

  function changeAudioSettings(
    soundEnabled: boolean,
    nextSoundVolume: number,
  ) {
    const audioSettings = {
      soundEnabled,
      soundVolume: clampSoundVolume(nextSoundVolume),
    };

    onAudioSettingsChange(audioSettings);

    if (!soundEnabled) {
      stopOvenSound();
      return;
    }

    if (phaseRef.current === "active") {
      playOvenSound(audioSettings);
    }
  }

  function finishSession() {
    if (phase !== "ready") {
      return;
    }

    completeSession();
  }

  function requestCancelSession() {
    if (phase !== "active") {
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
    if (phase !== "active") {
      return;
    }

    const activeSession = activeSessionRef.current;

    finalizedRef.current = true;
    activeSessionRef.current = null;
    stopOvenSound();
    onCancelSessionRef.current(
      activeSession?.tag ?? tag,
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
    stopOvenSound();
    onCompleteSessionRef.current(
      activeSession.tag,
      activeSession.duration,
      activeSession.startedAt,
      activeSession.pastryId,
    );
    phaseRef.current = "success";
    setPhase("success");
  }

  function playOvenSound(audioSettings = state.audioSettings) {
    const audio = audioRef.current;

    if (!audio || !audioSettings.soundEnabled) {
      return;
    }

    audio.volume = clampSoundVolume(audioSettings.soundVolume) / 100;
    void audio.play().catch(() => {});
  }

  function stopOvenSound() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();

    try {
      audio.currentTime = 0;
    } catch {
      return;
    }
  }

  if (phase !== "setup") {
    const ovenStatus: OvenStatus =
      phase === "active" ? "active" : phase === "expired" ? "expired" : "complete";

    return (
      <div className="timer-layout active-timer-layout">
        <section className="page-card oven-card" aria-label="Active study timer">
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
                  ? "Fresh from the oven"
                  : phase === "expired"
                    ? "Session stopped"
                    : "Baking now"}
              </h1>
            </div>
            <div className="session-heading__details">
              <p>
                {bakingPastry.name} - {duration} min - {tag}
              </p>
              <p className="reward-note">
                {phase === "expired"
                  ? `Reward not earned: ${formatCoinReward(coinReward)}.`
                  : phase === "success"
                    ? `Reward saved: ${formatCoinReward(coinReward)}.`
                    : `Complete this session to earn ${formatCoinReward(coinReward)}.`}
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
                ? "Done"
                : phase === "expired"
                  ? "Stopped early"
                : formatTime(remainingSeconds)
            }
          />

          <AudioControls
            onChange={changeAudioSettings}
            soundEnabled={state.audioSettings.soundEnabled}
            soundVolume={soundVolume}
          />

          {phase === "ready" && (
            <p className="setup-ready">
              Timer complete. Your pastry is ready to leave the oven.
            </p>
          )}
          {phase === "success" && (
            <p className="setup-ready">
              Session saved. Returning to your dashboard.
            </p>
          )}
          {phase === "expired" && (
            <p className="setup-expired">
              This pastry expired because the session was stopped early.
            </p>
          )}

          <p className="timer-action-help" id="finish-session-help">
            {phase === "ready"
              ? "Finish Session is available now."
              : "Finish Session becomes available when the countdown reaches zero."}
          </p>

          <div className="timer-action-row">
            <button
              aria-describedby="finish-session-help"
              className="button primary"
              disabled={phase !== "ready"}
              onClick={finishSession}
              type="button"
            >
              Finish Session
            </button>
            <button
              className="button danger"
              disabled={phase !== "active"}
              onClick={requestCancelSession}
              ref={cancelSessionButtonRef}
              type="button"
            >
              Cancel Session
            </button>
          </div>

          {showCancelConfirm && (
            <ConfirmationModal
              cancelLabel="Keep Baking"
              confirmLabel="Throw Away Pastry"
              message="If you stop now, this pastry will expire and move to your expired pastry bin. You will not earn coins for this session."
              onCancel={keepBaking}
              onConfirm={throwAwayPastry}
              title="Throw away this pastry?"
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="timer-layout">
      <section className="page-card timer-setup-card">
        <div>
          <p className="quiet-text">Pre-session setup</p>
          <h1>Prepare your bake</h1>
          <p>
            Choose a duration, study tag, and unlocked pastry. The countdown
            starts when you begin baking.
          </p>
        </div>

        <DurationSelector duration={duration} onChange={changeDuration} />

        <TagSelector onChange={setTag} selectedTag={tag} tags={studyTags} />

        <PastrySelector
          onSelect={onSelectPastry}
          pastries={pastries}
          selectedPastryId={selectedPastry.id}
          unlockedPastryIds={state.unlockedPastryIds}
        />

        <button className="button primary" onClick={startSession} type="button">
          Start Baking
        </button>
      </section>

      <section className="page-card oven-card" aria-label="Selected pastry preview">
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
              Selected for {duration} minutes of {tag.toLowerCase()}. Complete
              it to earn {formatCoinReward(coinReward)}.
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
        <AudioControls
          onChange={changeAudioSettings}
          soundEnabled={state.audioSettings.soundEnabled}
          soundVolume={soundVolume}
        />
      </section>
    </div>
  );
}

function AudioControls({
  onChange,
  soundEnabled,
  soundVolume,
}: {
  onChange: (soundEnabled: boolean, soundVolume: number) => void;
  soundEnabled: boolean;
  soundVolume: number;
}) {
  return (
    <section
      className="audio-controls"
      aria-describedby="oven-sound-help"
      aria-label="Study sound controls"
    >
      <p className="visually-hidden" id="oven-sound-help">
        Oven ambience plays only during an active study session.
      </p>
      <label className="audio-toggle">
        <input
          checked={soundEnabled}
          onChange={(event) => onChange(event.target.checked, soundVolume)}
          type="checkbox"
        />
        <span>Oven ambience</span>
      </label>

      <div className="audio-volume">
        <label htmlFor="oven-sound-volume">Volume</label>
        <input
          aria-valuetext={`${soundVolume}% volume`}
          id="oven-sound-volume"
          max={100}
          min={0}
          onChange={(event) => onChange(soundEnabled, Number(event.target.value))}
          type="range"
          value={soundVolume}
        />
        <span>{soundVolume}%</span>
      </div>
    </section>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatCoinReward(coins: number) {
  return `${coins} ${coins === 1 ? "coin" : "coins"}`;
}

function clampSoundVolume(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}
