import { apiSuccess, handleRouteError } from "@/lib/api/response";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const repo = await getRepository();
    const publication = await repo.getCurrentPublication();

    if (!publication) {
      return apiSuccess(null, { hasPublication: false });
    }

    // Strictly return sanitized public payload only — never raw survey rows or internal IDs
    return apiSuccess(
      {
        id: publication.id,
        status: publication.status,
        publishedAt: publication.publishedAt,
        caveats: publication.caveats,
        payload: publication.publicPayload,
      },
      { hasPublication: true },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
