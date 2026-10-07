import type { Services } from "./contracts";
import { mockServices } from "./mock";

/**
 * Service registry. Swap `mockServices` for HTTP implementations of the
 * same contracts when the backend is available.
 */
export const services: Services = mockServices;

export type * from "./contracts";
