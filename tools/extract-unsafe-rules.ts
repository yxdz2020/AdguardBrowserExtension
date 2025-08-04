/**
 * @file
 * This file is part of AdGuard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * AdGuard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * AdGuard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdGuard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */

import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert';

import { program } from 'commander';

import { AssetsFiltersBrowser, type Mv3AssetsFiltersBrowser } from './constants';

const exec = promisify(execCallback);

const extractUnsafeRules = async (browser: Mv3AssetsFiltersBrowser) => {
    const command = `pnpm exec dnr-rulesets exclude-unsafe-rules ./Extension/filters/${browser}/declarative`;
    const result = await exec(command);
    assert.ok(result.stderr === '', 'No errors during execution');
    assert.ok(result.stdout === '', 'No output during execution');
};

program
    .command(AssetsFiltersBrowser.ChromiumMv3)
    .description('Extract unsafe rules for Chromium MV3 filters')
    .action(async () => {
        await extractUnsafeRules(AssetsFiltersBrowser.ChromiumMv3);
    });

program
    .command(AssetsFiltersBrowser.OperaMv3)
    .description('Extract unsafe rules for Opera MV3 filters')
    .action(async () => {
        await extractUnsafeRules(AssetsFiltersBrowser.OperaMv3);
    });

program.parse(process.argv);
