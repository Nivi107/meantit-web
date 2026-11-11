// AG Grid setup shared by the dashboard and the admin page (both load lazily).
import { useEffect, useRef, useState } from "react";
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
  colorSchemeDarkBlue,
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

// The console look: ink-blue panels, thin borders, green accent.
export const theme = themeQuartz.withPart(colorSchemeDarkBlue).withParams({
  backgroundColor: "#0c1524",
  foregroundColor: "#e2eaf4",
  chromeBackgroundColor: "#101d30",
  headerBackgroundColor: "#101d30",
  headerTextColor: "#8da3be",
  borderColor: "rgba(255,255,255,0.08)",
  rowHoverColor: "rgba(255,255,255,0.03)",
  selectedRowBackgroundColor: "rgba(78,168,222,0.10)",
  oddRowBackgroundColor: "#0c1524",
  accentColor: "#00d68f",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 600,
  wrapperBorderRadius: 12,
  borderRadius: 6,
  columnBorder: false,
});

export const REFRESH_MS = 5000;

// Fetch a path now and every few seconds; returns [data, error, reload].
export function usePolling(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  // Requests already sent still count after a reload; only an older answer arriving late is dropped.
  // (Dropping every request in flight on reload meant a slow backend never showed anything new.)
  const sent = useRef(0);
  const shown = useRef(0);
  const current = useRef(path);
  current.current = path;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // again after React's dev-mode remount
    return () => (alive.current = false);
  }, []);
  useEffect(() => {
    const load = () => {
      const n = ++sent.current;
      api(path)
        .then((d) => {
          if (!alive.current || n < shown.current || current.current !== path) return;
          shown.current = n;
          setData(d);
          setError(null);
        })
        .catch((err) => alive.current && current.current === path && setError(err.message));
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [path, tick]);
  return [data, error, () => setTick((t) => t + 1)];
}

export const shortDate = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "";
