import {
  getLocalStorePath,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LocalJsonRepository } from "./local-repository";
import { SupabaseRepository } from "./supabase-repository";
import {
  RepositoryError,
  type AdminOverviewStats,
  type DataRepository,
  type PublicationRecord,
} from "./types";

class UnconfiguredRepository implements DataRepository {
  readonly mode = "unconfigured" as const;

  private fail(): never {
    throw new RepositoryError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "Database Supabase belum dikonfigurasi. Lengkapi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY pada .env.local.",
    );
  }

  async getCurrentPublication(): Promise<PublicationRecord | null> {
    return null;
  }

  async getAdminOverview(): Promise<AdminOverviewStats> {
    return {
      storageMode: "unconfigured",
      latestBatch: null,
      totalResponses: 0,
      eligibleResponses: 0,
      consistentResponses: 0,
      inconsistentResponses: 0,
      latestAhpPrimary: null,
      latestDataset: null,
      activeAlternativesCount: 0,
      verifiedEvidenceCount: 0,
      withdrawnCount: 0,
      latestSawRun: null,
      currentPublication: null,
      recentAuditLogs: [],
    };
  }

  async listResponseBatches() {
    return [];
  }
  async getResponseBatch() {
    return null;
  }
  async createResponseBatch(): Promise<never> {
    return this.fail();
  }
  async listAlternativeDatasets() {
    return [];
  }
  async getAlternativeDataset() {
    return null;
  }
  async createAlternativeDataset(): Promise<never> {
    return this.fail();
  }
  async duplicateDatasetToDraft(): Promise<never> {
    return this.fail();
  }
  async upsertDraftAlternative(): Promise<never> {
    return this.fail();
  }
  async toggleAlternativeActive(): Promise<never> {
    return this.fail();
  }
  async sealDataset(): Promise<never> {
    return this.fail();
  }
  async listAhpRuns() {
    return [];
  }
  async getAhpRunDetail() {
    return null;
  }
  async saveAhpRun(): Promise<never> {
    return this.fail();
  }
  async listSawRuns() {
    return [];
  }
  async getSawRunDetail() {
    return null;
  }
  async saveSawRun(): Promise<never> {
    return this.fail();
  }
  async listPublications() {
    return [];
  }
  async publishSnapshot(): Promise<never> {
    return this.fail();
  }
  async writeAuditLog(): Promise<void> {
    return;
  }
}

export async function getRepository(): Promise<DataRepository> {
  if (isSupabaseConfigured()) {
    const client = await createServerSupabaseClient();
    return new SupabaseRepository(client);
  }

  const localPath = getLocalStorePath();
  if (localPath) {
    return new LocalJsonRepository(localPath);
  }

  return new UnconfiguredRepository();
}

export * from "./types";
