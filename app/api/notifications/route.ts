import type { Prisma } from "@/lib/generated/prisma/client";

import { getPrisma } from "@/lib/db";
import { requireUser } from "@/lib/api/auth";
import { handleApiError, ok } from "@/lib/api/response";
import { formatChinaDateTime } from "@/lib/time";

const allowedStatuses = new Set(["success", "failed", "skipped"]);

export async function GET(request: Request) {
  try {
    const currentUser = await requireUser(["developer", "operator"]);
    const searchParams = new URL(request.url).searchParams;
    const requestedPage = Number(searchParams.get("page") || "1");
    const requestedPageSize = Number(searchParams.get("pageSize") || "10");
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = Number.isInteger(requestedPageSize) ? Math.min(Math.max(requestedPageSize, 5), 50) : 10;
    const query = (searchParams.get("q") || "").trim().slice(0, 100);
    const status = searchParams.get("status") || "all";
    const event = (searchParams.get("event") || "all").trim().slice(0, 50);

    const ownershipWhere: Prisma.NotificationLogWhereInput = { recipientId: currentUser.id };
    const filters: Prisma.NotificationLogWhereInput[] = [ownershipWhere];
    if (query) {
      filters.push({ OR: [
        { content: { contains: query, mode: "insensitive" } },
        { event: { contains: query, mode: "insensitive" } },
      ] });
    }
    if (allowedStatuses.has(status)) filters.push({ status });
    if (event !== "all") filters.push({ event });
    const where: Prisma.NotificationLogWhereInput = { AND: filters };
    const db = getPrisma();

    const [items, total, allCount, successCount, failedCount, skippedCount, eventRows] = await Promise.all([
      db.notificationLog.findMany({
        where,
        include: { recipient: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notificationLog.count({ where }),
      db.notificationLog.count({ where: ownershipWhere }),
      db.notificationLog.count({ where: { ...ownershipWhere, status: "success" } }),
      db.notificationLog.count({ where: { ...ownershipWhere, status: "failed" } }),
      db.notificationLog.count({ where: { ...ownershipWhere, status: "skipped" } }),
      db.notificationLog.findMany({
        where: ownershipWhere,
        distinct: ["event"],
        select: { event: true },
        orderBy: { event: "asc" },
      }),
    ]);

    return ok({
      items: items.map((item) => ({
        id: item.id,
        target: item.recipient?.name || currentUser.name,
        event: item.event,
        content: item.content,
        time: formatChinaDateTime(item.createdAt),
        status: item.status,
        success: item.status === "success",
      })),
      total,
      page,
      pageSize,
      summary: { all: allCount, success: successCount, failed: failedCount, skipped: skippedCount },
      events: eventRows.map((row) => row.event),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
