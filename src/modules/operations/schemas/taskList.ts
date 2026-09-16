import { paginationParams } from "@/lib/api";

/**
 * Transport contract for GET /api/tasks query strings.
 * Parsing (names, aliases, defaults) lives at the HTTP edge; sentinel
 * interpretation (QUEUED/ALL/UNASSIGNED) lives in application/listTasks.ts
 * as query semantics. `paginationParams` throw → 500 via apiError is
 * preserved legacy behavior (not upgraded to 422 here).
 */
export interface TaskListFilters {
  farmId: string | null;
  day: string | null;
  q: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  assignee: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface TaskListParams {
  filters: TaskListFilters;
  limit: number;
  offset: number;
}

export function parseTaskListParams(search: URLSearchParams): TaskListParams {
  const { limit, offset } = paginationParams(search);
  return {
    filters: {
      farmId: search.get("farmId"),
      day: search.get("date"),
      q: search.get("search")?.trim() || search.get("q")?.trim() || null,
      status: search.get("status")?.trim() || null,
      priority: search.get("priority")?.trim() || null,
      category: search.get("category")?.trim() || null,
      assignee: search.get("assignedOfficerId")?.trim() || search.get("assignee")?.trim() || null,
      dateFrom: search.get("dateFrom") || search.get("from"),
      dateTo: search.get("dateTo") || search.get("to"),
    },
    limit,
    offset,
  };
}
