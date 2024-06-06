export const zip = <T, V>(a: T[], b: V[]): [T, V][] =>
  a.map((k, i) => [k, b[i]]);
