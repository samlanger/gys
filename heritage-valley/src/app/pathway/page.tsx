import { ComingSoon } from "@/components/ComingSoon";

export default function PathwayRoom() {
  return (
    <ComingSoon
      title="Pathway Room"
      intro="Later phase. This room will work backward from the shared North Star to concrete moves."
      items={[
        "Now (0–12 months) / Next (1–3 years) / Later (3–10 years) roadmap",
        "Action cards: owner, cost range, rules touched, case-study evidence, expected effect, risks",
        "One-page decision brief for a board or council agenda, citations included",
      ]}
    />
  );
}
