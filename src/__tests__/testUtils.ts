export class NoErrorThrownError extends Error {}

/**
 * utility function to catch an error from a function call for assertion purposes
 * @param call
 */
export const getError = async (call: () => unknown): Promise<Error> => {
  try {
    await call(); // this line is expected to throw an error

    throw new NoErrorThrownError();
  } catch (error) {
    return error;
  }
};