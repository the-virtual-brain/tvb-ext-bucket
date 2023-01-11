/**
 * Utility function to validate a file name
 * @param fileName
 */
export const isValidFileName = (fileName: string): boolean => {
  const rg1 = /^[^\\/:*?"<>|]+$/; // forbidden characters \ / : * ? " < > |
  const rg2 = /.*[^.]$/; // must not end with .
  const rg3 = /^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names

  return rg1.test(fileName) && rg2.test(fileName) && !rg3.test(fileName);
};
