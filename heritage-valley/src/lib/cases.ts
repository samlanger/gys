import data from "../../data/case-studies.json";
import type { DocumentRow } from "./library";

export interface CaseStudy {
  id: string;
  town: string;
  region: string;
  moveTypes: string[];
  researchFocus: string;
}

export const CASE_STUDIES: CaseStudy[] = data.cases;

const VALLEY_TOWNS = ["fillmore", "piru", "santa paula"];

/**
 * Library documents that are evidence for a case: case-study documents tagged
 * with the town, or for the valley baseline, local studies tagged with a valley town.
 */
export function evidenceFor(cs: CaseStudy, docs: DocumentRow[]): DocumentRow[] {
  const baseline = cs.id === "fillmore-piru-santa-paula";
  const towns = baseline ? VALLEY_TOWNS : [cs.town.toLowerCase()];
  const category = baseline ? "local_studies" : "case_studies";
  return docs.filter((d) => d.category === category && d.geography.some((g) => towns.includes(g.toLowerCase())));
}
