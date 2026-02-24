import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "agent heartbeats",
  { minutes: 30 },
  internal.heartbeatScheduler.runAllHeartbeats,
);

crons.interval(
  "cleanup stale runs",
  { minutes: 15 },
  internal.cleanup.cleanupStaleRuns,
);

export default crons;
