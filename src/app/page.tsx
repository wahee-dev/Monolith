import { createLedger } from '@law/ledger';
import MeshPage from '@mesh/components/MeshPage';

export default function Home(): React.ReactElement {
  const ledger = createLedger();

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <h1 style={{ color: '#4a9eff', fontSize: '2rem', marginBottom: '0.5rem' }}>
        Monolith Engine
      </h1>
      <p style={{ color: '#888888', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Law layer initialized — ledger entries: {ledger.entries.length}
      </p>
      <MeshPage />
    </main>
  );
}
