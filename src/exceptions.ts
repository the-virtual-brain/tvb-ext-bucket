/**
 * Error to be thrown when there is a problem related to breadcrumbs in the file browser
 */
export class BreadCrumbNotFoundError extends Error {}

/**
 * Error to be thrown when a file name and path to the file are incompatible
 */
export class FilePathMatchError extends Error {}

/**
 * Error to be thrown when a file name is not valid
 */
export class FileNameError extends Error {}

/**
 * Error to be thrown when a directory doesn't meet a criteria
 */
export class InvalidDirectoryError extends Error {}

/**
 * Error to be thrown when something is used out of context
 */
export class ContextError extends Error {}
