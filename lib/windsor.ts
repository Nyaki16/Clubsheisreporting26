// Windsor.ai data is accessed via MCP tools (get_data, get_fields, get_options)
// This file provides helper types and utilities for structuring Windsor queries

export interface WindsorQuery {
  connector: string;
  fields: string[];
  dateFrom: string;
  dateTo: string;
  accountId?: string;
}

export function buildWindsorDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of month
  return {
    dateFrom: start.toISOString().split("T")[0],
    dateTo: end.toISOString().split("T")[0],
  };
}

export function buildISODateRange(year: number, month: number): { start: string; end: string } {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}
