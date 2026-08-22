type DeveloperToolsProps = {
  onAddCoins: () => void;
  onAddDemoCompletedSessions: () => void;
  onAddDemoExpiredSessions: () => void;
  onFinishTestSession: () => void;
  onRunLocalMigration: () => void;
  onResetData: () => void;
};

export function DeveloperTools({
  onAddCoins,
  onAddDemoCompletedSessions,
  onAddDemoExpiredSessions,
  onFinishTestSession,
  onRunLocalMigration,
  onResetData,
}: DeveloperToolsProps) {
  return (
    <details className="developer-tools">
      <summary>Developer Tools</summary>
      <div className="developer-tools__actions">
        <button className="button" onClick={onResetData} type="button">
          Reset all data
        </button>
        <button
          className="button"
          onClick={onAddDemoCompletedSessions}
          type="button"
        >
          Add demo completed sessions
        </button>
        <button
          className="button"
          onClick={onAddDemoExpiredSessions}
          type="button"
        >
          Add demo expired sessions
        </button>
        <button className="button" onClick={onAddCoins} type="button">
          Add 100 coins
        </button>
        <button className="button" onClick={onFinishTestSession} type="button">
          Finish test study session
        </button>
        {import.meta.env.DEV && (
          <button className="button" onClick={onRunLocalMigration} type="button">
            Run local migration
          </button>
        )}
        {import.meta.env.DEV && (
          <button
            className="button"
            onClick={() => {
              throw new Error("Sentry test error (Developer Tools)");
            }}
            type="button"
          >
            Trigger test error
          </button>
        )}
      </div>
    </details>
  );
}
