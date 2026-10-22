import { alpine } from "./alpine";
import { astonMartin } from "./aston-martin";
import { audi } from "./audi";
import { cadillac } from "./cadillac";
import { ferrari } from "./ferrari";
import { haas } from "./haas";
import { mclaren } from "./mclaren";
import { mercedes } from "./mercedes";
import { racingBulls } from "./racing-bulls";
import { redBullRacing } from "./red-bull-racing";
import { williams } from "./williams";
import type { TeamContent } from "./types";

export type { TeamContent, TeamMilestone } from "./types";

// Um arquivo por equipe (slug de lib/teams.ts).
const content: Record<string, TeamContent> = { ferrari, mercedes, mclaren, "red-bull-racing": redBullRacing, "aston-martin": astonMartin, williams, alpine, haas, "racing-bulls": racingBulls, audi, cadillac };

export const getTeamContent = (slug: string): TeamContent | undefined => content[slug];
