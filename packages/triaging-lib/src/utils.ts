/**
 * Shared utility functions for triaging-lib
 */

/**
 * Creates standardized Langfuse metadata
 * @param additionalMetadata - Additional metadata specific to the trace
 * @returns Merged metadata object with standard fields + additional fields
 */
export function getStandardLangfuseMetadata(additionalMetadata?: Record<string, any>): Record<string, any> {
  return {
    environment: process.env.NODE_ENV || 'development',
    ...additionalMetadata
  };
}
