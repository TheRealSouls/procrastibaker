type DeveloperToolsProps = {
  onAddCoins: () => void;
  onAddDemoCompletedSessions: () => void;
  onAddDemoExpiredSessions: () => void;
  onResetData: () => void;
};

export function DeveloperTools({
  onAddCoins,
  onAddDemoCompletedSessions,
  onAddDemoExpiredSessions,
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
      </div>
    </details>
  );
}
