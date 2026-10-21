/** «1 póliza» / «3 pólizas»: concuerda el sustantivo con la cantidad. */
export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`;
}
