export const href = (path = "") =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path}`;
export const hours = (n: number | null) =>
  n === null ? "Unavailable" : `${n.toFixed(1)} h`;
export const date = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
