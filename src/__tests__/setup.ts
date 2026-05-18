import { beforeEach } from "vitest";
import { db } from "../db";
import { accounts, sourceVideos, clips, schedules } from "../db/schema";

beforeEach(async () => {
  await db.delete(schedules);
  await db.delete(clips);
  await db.delete(sourceVideos);
  await db.delete(accounts);
});
