import * as path from 'path';
import * as fs from 'fs';
import { Rule } from 'eslint';
import { findUpMultipleSync } from 'find-up';

interface Lockfile {
  /** Path of the lockfile */
  path: string;

  /** List of rules loaded from the lockfile */
  rules: string[];
}

// Should be recursive, up to root
// naive impl first
const loadLockfile = (lockfilePath: string): Lockfile => {
  const lines: string[] = [];

  const buf = fs.readFileSync(lockfilePath, 'utf-8');
  buf.split(/\r?\n/).forEach(line => lines.push(line));

  return {
    path: lockfilePath,
    rules: lines.filter(l => l.length > 0),
  };
};

const lockfileRule: Rule.RuleModule = {
  meta: {
    docs: {
      description: 'Enforce code locality',
      category: 'Shitlists',
      recommended: true,
    },
    schema: [
      {
        properties: {
          lockfile: { type: 'string', required: false },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
  create: (context: Rule.RuleContext) => {
    return {
      Program: node => {
        const lockfileBasename = context.options[0]?.lockfile ?? '.lockfile';
        const lockfiles = findUpMultipleSync(lockfileBasename, {
          stopAt: context.getCwd(),
        }).map(loadLockfile);

        const allowed = lockfiles.some(lockfile => {
          const basename = path.basename(context.getFilename());
          console.log('Running lockfile:', lockfile.path);

          if (
            lockfile.rules.some(rule => {
              console.log('Rule test', rule, '~', basename);
              return basename.match(rule);
            })
          ) {
            console.log('File allowed by lockfile:', lockfile.path);
            return true;
          }
        });

        if (!allowed) {
          context.report({
            node,
            message: `This file cannot be here.`,
          });
        }
      },
    };
  },
};

export default lockfileRule;
