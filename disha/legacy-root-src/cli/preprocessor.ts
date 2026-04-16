import { feature } from 'bun:bundle';
import { gracefulShutdownSync } from '../utils/gracefulShutdown.js';

export type PendingConnect = {
  url: string | undefined;
  authToken: string | undefined;
  dangerouslySkipPermissions: boolean;
};

export type PendingAssistantChat = {
  sessionId?: string;
  discover: boolean;
};

export type PendingSSH = {
  host: string | undefined;
  cwd: string | undefined;
  permissionMode: string | undefined;
  dangerouslySkipPermissions: boolean;
  local: boolean;
  extraCliArgs: string[];
};

export const _pendingConnect: PendingConnect | undefined = feature('DIRECT_CONNECT') ? {
  url: undefined,
  authToken: undefined,
  dangerouslySkipPermissions: false
} : undefined;

export const _pendingAssistantChat: PendingAssistantChat | undefined = feature('KAIROS') ? {
  sessionId: undefined,
  discover: false
} : undefined;

export const _pendingSSH: PendingSSH | undefined = feature('SSH_REMOTE') ? {
  host: undefined,
  cwd: undefined,
  permissionMode: undefined,
  dangerouslySkipPermissions: false,
  local: false,
  extraCliArgs: []
} : undefined;

export async function processEarlyArgs() {
  const rawCliArgs = process.argv.slice(2);

  // Direct Connect Handler
  if (feature('DIRECT_CONNECT') && _pendingConnect) {
    const ccIdx = rawCliArgs.findIndex(a => a.startsWith('cc://') || a.startsWith('cc+unix://'));
    if (ccIdx !== -1) {
      const ccUrl = rawCliArgs[ccIdx]!;
      const { parseConnectUrl } = await import('../server/parseConnectUrl.js');
      const parsed = parseConnectUrl(ccUrl);
      _pendingConnect.dangerouslySkipPermissions = rawCliArgs.includes('--dangerously-skip-permissions');
      
      if (rawCliArgs.includes('-p') || rawCliArgs.includes('--print')) {
        const stripped = rawCliArgs.filter((_, i) => i !== ccIdx);
        const dspIdx = stripped.indexOf('--dangerously-skip-permissions');
        if (dspIdx !== -1) stripped.splice(dspIdx, 1);
        process.argv = [process.argv[0]!, process.argv[1]!, 'open', ccUrl, ...stripped];
      } else {
        _pendingConnect.url = parsed.serverUrl;
        _pendingConnect.authToken = parsed.authToken;
        const stripped = rawCliArgs.filter((_, i) => i !== ccIdx);
        const dspIdx = stripped.indexOf('--dangerously-skip-permissions');
        if (dspIdx !== -1) stripped.splice(dspIdx, 1);
        process.argv = [process.argv[0]!, process.argv[1]!, ...stripped];
      }
    }
  }

  // Assistant Handler
  if (feature('KAIROS') && _pendingAssistantChat) {
    const rawArgs = process.argv.slice(2);
    if (rawArgs[0] === 'assistant') {
      const nextArg = rawArgs[1];
      if (nextArg && !nextArg.startsWith('-')) {
        _pendingAssistantChat.sessionId = nextArg;
        rawArgs.splice(0, 2);
        process.argv = [process.argv[0]!, process.argv[1]!, ...rawArgs];
      } else if (!nextArg) {
        _pendingAssistantChat.discover = true;
        rawArgs.splice(0, 1);
        process.argv = [process.argv[0]!, process.argv[1]!, ...rawArgs];
      }
    }
  }

  // SSH Handler
  if (feature('SSH_REMOTE') && _pendingSSH) {
    const rawCliArgs = process.argv.slice(2);
    if (rawCliArgs[0] === 'ssh') {
      const localIdx = rawCliArgs.indexOf('--local');
      if (localIdx !== -1) {
        _pendingSSH.local = true;
        rawCliArgs.splice(localIdx, 1);
      }
      const dspIdx = rawCliArgs.indexOf('--dangerously-skip-permissions');
      if (dspIdx !== -1) {
        _pendingSSH.dangerouslySkipPermissions = true;
        rawCliArgs.splice(dspIdx, 1);
      }
      const pmIdx = rawCliArgs.indexOf('--permission-mode');
      if (pmIdx !== -1 && rawCliArgs[pmIdx + 1] && !rawCliArgs[pmIdx + 1]!.startsWith('-')) {
        _pendingSSH.permissionMode = rawCliArgs[pmIdx + 1];
        rawCliArgs.splice(pmIdx, 2);
      }
      const pmEqIdx = rawCliArgs.findIndex(a => a.startsWith('--permission-mode='));
      if (pmEqIdx !== -1) {
        _pendingSSH.permissionMode = rawCliArgs[pmEqIdx]!.split('=')[1];
        rawCliArgs.splice(pmEqIdx, 1);
      }

      const extractFlag = (flag: string, opts: { hasValue?: boolean; as?: string; } = {}) => {
        const i = rawCliArgs.indexOf(flag);
        if (i !== -1) {
          _pendingSSH.extraCliArgs.push(opts.as ?? flag);
          const val = rawCliArgs[i + 1];
          if (opts.hasValue && val && !val.startsWith('-')) {
            _pendingSSH.extraCliArgs.push(val);
            rawCliArgs.splice(i, 2);
          } else {
            rawCliArgs.splice(i, 1);
          }
        }
        const eqI = rawCliArgs.findIndex(a => a.startsWith(`${flag}=`));
        if (eqI !== -1) {
          _pendingSSH.extraCliArgs.push(opts.as ?? flag, rawCliArgs[eqI]!.slice(flag.length + 1));
          rawCliArgs.splice(eqI, 1);
        }
      };
      
      extractFlag('-c', { as: '--continue' });
      extractFlag('--continue');
      extractFlag('--resume', { hasValue: true });
      extractFlag('--model', { hasValue: true });

      if (rawCliArgs[1] && !rawCliArgs[1].startsWith('-')) {
        _pendingSSH.host = rawCliArgs[1];
        let consumed = 2;
        if (rawCliArgs[2] && !rawCliArgs[2].startsWith('-')) {
          _pendingSSH.cwd = rawCliArgs[2];
          consumed = 3;
        }
        const rest = rawCliArgs.slice(consumed);

        if (rest.includes('-p') || rest.includes('--print')) {
          process.stderr.write('Error: headless (-p/--print) mode is not supported with claude ssh\n');
          gracefulShutdownSync(1);
          return;
        }
        process.argv = [process.argv[0]!, process.argv[1]!, ...rest];
      }
    }
  }
}
