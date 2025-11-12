import { exec } from 'child_process';
import { promisify } from 'util';
import { getEnvConfig } from '@renisa-ai/config/env';
import { LangfuseClient } from '@langfuse/client';
import { Logger } from '@renisa-ai/utils';

const execAsync = promisify(exec);
const { logLevel } = getEnvConfig();
const logger = new Logger(logLevel, 'info');

interface GitInfo {
  branch?: string;
  commit?: string;
}

/**
 * Gets git information with proper error handling.
 * Returns undefined values if git is not available (e.g., in containers, Vercel).
 */
async function getGitInfo(): Promise<GitInfo> {
  const info: GitInfo = {};

  try {
    // Try to get git branch
    const branchResult = await execAsync('git rev-parse --abbrev-ref HEAD', {
      timeout: 2000, // 2 second timeout
    });
    info.branch = branchResult.stdout.trim();
  } catch (error) {
    // Git not available or not a git repository - this is fine in production
    logger.debug('Git branch info not available (this is expected in containers/Vercel)');
  }

  try {
    // Try to get git commit hash
    const commitResult = await execAsync('git rev-parse --short HEAD', {
      timeout: 2000,
    });
    info.commit = commitResult.stdout.trim();
  } catch (error) {
    // Git not available - this is fine in production
    logger.debug('Git commit info not available (this is expected in containers/Vercel)');
  }

  return info;
}

interface PromptInfo {
  name: string;
  version: number;
  label: string;
}

/**
 * List of prompt names used in the system.
 * Update this array when adding new prompts.
 */
const PROMPT_NAMES = [
  'Orchestrator',
  'Intent Classifier',
  'Data Extractor',
  'Data Validator',
  'FNOL Agent',
];

/**
 * Gets information about currently loaded prompts from Langfuse.
 * Returns undefined values if Langfuse is not configured.
 */
async function getPromptVersions(): Promise<PromptInfo[]> {
  try {
    const { langfuse } = getEnvConfig();

    if (!langfuse.withObservability) {
      logger.debug('Langfuse not configured, skipping prompt version fetch');
      return [];
    }

    const langfuseClient = new LangfuseClient(langfuse.config);
    const promptInfos: PromptInfo[] = [];

    for (const promptName of PROMPT_NAMES) {
      try {
        // Try to get the prompt with the configured label
        let prompt;
        let actualLabel = langfuse.label;

        try {
          prompt = await langfuseClient.prompt.get(promptName, {
            label: langfuse.label,
          });
        } catch (labelError) {
          // Fall back to latest if label not found
          prompt = await langfuseClient.prompt.get(promptName);
          actualLabel = 'latest';
        }

        promptInfos.push({
          name: promptName,
          version: prompt.version,
          label: actualLabel,
        });
      } catch (error) {
        logger.debug(`Failed to fetch prompt '${promptName}':`, error instanceof Error ? error.message : String(error));
      }
    }

    return promptInfos;
  } catch (error) {
    logger.debug('Failed to fetch prompt versions:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Gets backend information including environment and git details.
 * Safe to call in any environment (local, staging, production, containers, Vercel).
 */
export async function getBackendInfo() {
  const { env } = getEnvConfig();
  const gitInfo = await getGitInfo();
  const prompts = await getPromptVersions();

  // Get version from package.json
  let version: string | undefined;
  try {
    // Note: In production builds, package.json might not be available
    version = process.env.npm_package_version || '1.0.0';
  } catch (error) {
    version = undefined;
  }

  return {
    environment: env,
    gitBranch: gitInfo.branch,
    gitCommit: gitInfo.commit,
    version,
    prompts,
  };
}
