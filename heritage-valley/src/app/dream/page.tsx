import { ComingSoon } from "@/components/ComingSoon";

export default function DreamRoom() {
  return (
    <ComingSoon
      title="Dream Room"
      intro="Next phase. This room will evoke and record each stakeholder's vision of the valley."
      items={[
        "Guided future interview: “It's 2040. A visitor spends a perfect day in the valley. Walk me through it.”",
        "Vision card: a one-page future-state story plus 5–8 measurable targets",
        "Alignment map: shared themes, divergent ones, and open tensions, attributed by stakeholder type",
        "Shared North Star: the consolidated vision the group approves",
      ]}
    />
  );
}
