import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "agent heartbeats",
  { minutes: 30 },
  internal.heartbeatScheduler.runAllHeartbeats,
);

export default crons;
