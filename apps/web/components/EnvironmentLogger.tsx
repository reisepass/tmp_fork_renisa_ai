'use client';

import { useEffect } from 'react';

// DEPRECATED: Backend info interfaces are no longer used since /api/info endpoint was removed
// interface PromptInfo {
//   name: string;
//   version: number;
//   label: string;
// }
//
// interface BackendInfo {
//   environment: string;
//   gitBranch?: string;
//   gitCommit?: string;
//   version?: string;
//   prompts?: PromptInfo[];
// }

export function EnvironmentLogger() {
  // DEPRECATED: Backend info state is no longer used
  // const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);

  useEffect(() => {
    const frontendEnv = process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown';
    const backendUrl = process.env.NEXT_PUBLIC_MASTRA_URL || 'unknown';

    // Determine environment from backend URL if not explicitly set
    let detectedEnv = frontendEnv;
    if (frontendEnv === 'unknown') {
      if (backendUrl.includes('localhost')) {
        detectedEnv = 'local';
      } else if (backendUrl.includes('staging')) {
        detectedEnv = 'staging';
      } else if (backendUrl.includes('api.renisa.ai')) {
        detectedEnv = 'production';
      }
    }

    console.log('%c🔧 Environment Information', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #3b82f6;');
    console.log(`%cFrontend Environment: %c${detectedEnv.toUpperCase()}`, 'color: #6b7280;', 'font-weight: bold; color: #10b981;');
    console.log(`%cBackend URL: %c${backendUrl}`, 'color: #6b7280;', 'font-weight: bold; color: #8b5cf6;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #3b82f6;');

    // DEPRECATED: Backend info endpoint has been removed
    // const fetchBackendInfo = async () => {
    //   try {
    //     const response = await fetch(`${backendUrl}/api/info`);
    //
    //     if (response.ok) {
    //       const data = await response.json();
    //       setBackendInfo(data);
    //
    //       console.log(`%cBackend Environment: %c${data.environment?.toUpperCase() || 'unknown'}`, 'color: #6b7280;', 'font-weight: bold; color: #10b981;');
    //       if (data.gitBranch) {
    //         console.log(`%cBackend Git Branch: %c${data.gitBranch}`, 'color: #6b7280;', 'font-weight: bold; color: #f59e0b;');
    //       }
    //       if (data.gitCommit) {
    //         console.log(`%cBackend Git Commit: %c${data.gitCommit}`, 'color: #6b7280;', 'font-weight: bold; color: #f59e0b;');
    //       }
    //       if (data.version) {
    //         console.log(`%cBackend Version: %c${data.version}`, 'color: #6b7280;', 'font-weight: bold; color: #ec4899;');
    //       }
    //
    //       // Display prompt versions
    //       if (data.prompts && data.prompts.length > 0) {
    //         console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #3b82f6;');
    //         console.log('%c📝 Langfuse Prompt Versions', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    //         console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #3b82f6;');
    //
    //         data.prompts.forEach((prompt: PromptInfo) => {
    //           console.log(
    //             `%c${prompt.name}: %cv${prompt.version} %c(${prompt.label})`,
    //             'color: #6b7280;',
    //             'font-weight: bold; color: #10b981;',
    //             'color: #f59e0b;'
    //           );
    //         });
    //       }
    //     }
    //   } catch (error) {
    //     console.log('%cBackend Info: %cUnavailable (endpoint not implemented yet)', 'color: #6b7280;', 'font-weight: bold; color: #ef4444;');
    //   }
    //
    //   console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #3b82f6;');
    // };
    //
    // fetchBackendInfo();
  }, []);

  return null;
}
