import { summarizeDistance, summarizeTripExpenses } from './calculations.js';

export function calcRecordSummary(trips, expenses) {
  return { trip_count: trips.length, ...summarizeDistance(trips), expenses: summarizeTripExpenses(expenses) };
}
