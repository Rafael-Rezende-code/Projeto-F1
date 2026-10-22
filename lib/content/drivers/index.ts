import { bortoleto } from "./bortoleto";
import { hamilton } from "./hamilton";
import { norris } from "./norris";
import type { DriverContent } from "./types";
import { verstappen } from "./verstappen";

export type { DriverContent, DriverFact } from "./types";

const content: Record<string, DriverContent> = { norris, verstappen, hamilton, bortoleto };

export const getDriverContent = (slug: string): DriverContent | undefined => content[slug];
