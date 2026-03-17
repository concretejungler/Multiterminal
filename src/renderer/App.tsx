import { AppShell } from './components/AppShell';
import { useSoundNotification } from './hooks/useSound';

export default function App() {
  useSoundNotification();
  return <AppShell />;
}
