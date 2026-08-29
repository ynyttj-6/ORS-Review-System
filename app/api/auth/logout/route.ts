import { handleApiError, ok } from "@/lib/api/response";
import { revokeCurrentSession } from "@/lib/security/session";

export async function POST() {
  try {
    await revokeCurrentSession();
    return ok({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
