/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentRuns from "../agentRuns.js";
import type * as agents from "../agents.js";
import type * as chatRunner from "../chatRunner.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as execute from "../execute.js";
import type * as flyOrchestrator from "../flyOrchestrator.js";
import type * as heartbeatRunner from "../heartbeatRunner.js";
import type * as heartbeatScheduler from "../heartbeatScheduler.js";
import type * as heartbeats from "../heartbeats.js";
import type * as messages from "../messages.js";
import type * as orgChart from "../orgChart.js";
import type * as r2 from "../r2.js";
import type * as tasks from "../tasks.js";
import type * as tools_index from "../tools/index.js";
import type * as tools_sendMessageToAgent from "../tools/sendMessageToAgent.js";
import type * as tools_types from "../tools/types.js";
import type * as tools_webFetch from "../tools/webFetch.js";
import type * as tools_webSearch from "../tools/webSearch.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentRuns: typeof agentRuns;
  agents: typeof agents;
  chatRunner: typeof chatRunner;
  crons: typeof crons;
  crypto: typeof crypto;
  execute: typeof execute;
  flyOrchestrator: typeof flyOrchestrator;
  heartbeatRunner: typeof heartbeatRunner;
  heartbeatScheduler: typeof heartbeatScheduler;
  heartbeats: typeof heartbeats;
  messages: typeof messages;
  orgChart: typeof orgChart;
  r2: typeof r2;
  tasks: typeof tasks;
  "tools/index": typeof tools_index;
  "tools/sendMessageToAgent": typeof tools_sendMessageToAgent;
  "tools/types": typeof tools_types;
  "tools/webFetch": typeof tools_webFetch;
  "tools/webSearch": typeof tools_webSearch;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
