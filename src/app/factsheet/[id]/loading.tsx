import { LoadingScreen } from "@/components/LoadingScreen";

/** Wird angezeigt, solange das Factsheet auf dem Server zusammengestellt wird. */
export default function Loading() {
  return <LoadingScreen title="Factsheet wird geladen." sub="Einen Moment." />;
}
