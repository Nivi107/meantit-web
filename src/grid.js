// AG Grid setup shared by the dashboard and the admin page (both load lazily).
import { useEffect, useState } from "react";
import {
  CellStyleModule,
  ClientSideRowModelModule,
  CsvExportModule,
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  QuickFilterModule,
  RowAutoHeightModule,
  RowStyleModule,
  TextFilterModule,
  TooltipModule,
  ValidationModule,
  themeQuartz,
} from "ag-grid-community";
import { api } from "./api.js";

// Only the grid features these pages use, to keep the download small.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  QuickFilterModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  CsvExportModule,
  PaginationModule,
  TooltipModule,
  RowStyleModule,
  CellStyleModule,
  RowAutoHeightModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []), // explains grid mistakes in the console
]);

export const theme = themeQuartz.withParams({
  accentColor: "#4f46e5",
  headerBackgroundColor: "#f8fafc",
  fontFamily: "inherit",
  rowHoverColor: "#eef2ff",
});

export const REFRESH_MS = 5000;

// Fetch a path now and every few seconds; returns [data, error, reload].
export function usePolling(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api(path)
        .then((d) => alive && (setData(d), setError(null)))
        .catch((err) => alive && setError(err.message));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [path, tick]);
  return [data, error, () => setTick((t) => t + 1)];
}

export const shortDate = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";
