import { createLedger } from '@law/ledger';

export default function Home(): React.ReactElement {
  const ledger = createLedger();

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <h1 style={{ color: '#4a9eff', fontSize: '2rem', marginBottom: '1rem' }}>
        Monolith Engine
      </h1>
      <p style={{ color: '#888888', fontSize: '0.875rem' }}>
        Law layer initialized — ledger entries: {ledger.entries.length}
      </p>
    </main>
  );
}
