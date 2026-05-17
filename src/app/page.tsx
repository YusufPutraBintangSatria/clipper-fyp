import Dashboard from "./Dashboard";
import { getAccounts, getSourceVideos, getClips, getSchedules } from "./actions";

export const revalidate = 0;

export default async function Home() {
  const accounts = await getAccounts();
  const sourceVideos = await getSourceVideos();
  const clips = await getClips();
  const schedules = await getSchedules();

  return (
    <Dashboard
      initialAccounts={accounts}
      initialSourceVideos={sourceVideos}
      initialClips={clips}
      initialSchedules={schedules}
    />
  );
}
