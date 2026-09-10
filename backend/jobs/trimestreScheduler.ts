import { schedule } from "node-cron";
import { syncActiveTrimestresByDate } from "../services/trimestreService";

const DAILY_CRON = "5 0 * * *";

const runSync = async (): Promise<void> => {
  try {
    await syncActiveTrimestresByDate();
    console.log("[TRIMESTRES] Synchronisation automatique terminée.");
  } catch (error: any) {
    console.error(
      `[TRIMESTRES] Échec de la synchronisation automatique : ${error.message ?? error}`,
    );
  }
};

export const startTrimestreScheduler = (): void => {
  runSync();
  schedule(DAILY_CRON, runSync);
  console.log(
    `[TRIMESTRES] Rotation quotidienne planifiée (${DAILY_CRON}).`,
  );
};