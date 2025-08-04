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

import { Option, program } from 'commander';

import {
    Browser,
    MV3_BROWSERS,
    BROWSER_TO_DNR_BROWSER_MAP,
    type Mv3Browser,
} from './constants';

const exec = promisify(execCallback);

const browserArgument = new Option('-b, --browser <browser>', 'Browser filters to use for debugging')
    .default(Browser.ChromeMv3)
    .choices(MV3_BROWSERS);

program
    .command('load')
    .addOption(browserArgument)
    .description('Load filters for the specified browser')
    .action(async (options) => {
        const browser = options.browser as Mv3Browser;
        const dnrRulesetsBrowser = BROWSER_TO_DNR_BROWSER_MAP[browser];
        const command = `pnpm exec dnr-rulesets load --latest-filters --browser ${dnrRulesetsBrowser} ./build/dev/${browser}/filters`;
        const result = await exec(command);
        assert.ok(result.stderr === '', 'No errors during execution');
    });

program
    .command('convert')
    .addOption(browserArgument)
    .description('Convert filters for the specified browser')
    .action(async (options) => {
        const browser = options.browser as Mv3Browser;
        const command = `pnpm exec tsurlfilter convert --debug ./build/dev/${browser}/filters /web-accessible-resources/redirects ./build/dev/${browser}/filters/declarative`;
        const result = await exec(command);
        assert.ok(result.stderr === '', 'No errors during execution');
    });

program
    .command('watch')
    .addOption(browserArgument)
    .description('Watch for changes in filters and reload them')
    .action(async (options) => {
        const browser = options.browser as Mv3Browser;
        const command = `pnpm debug-filters:extract -b ${browser} && pnpm exec dnr-rulesets watch --debug ./build/dev/${browser}/manifest.json /web-accessible-resources/redirects`;
        const result = await exec(command);
        assert.ok(result.stderr === '', 'No errors during execution');
    });

program
    .command('extract')
    .addOption(browserArgument)
    .description('Extract filters from the specified browser filters')
    .action(async (options) => {
        const browser = options.browser as Mv3Browser;
        const command = `pnpm exec tsurlfilter extract-filters ./build/dev/${browser}/filters/declarative ./build/dev/${browser}/filters`;
        const result = await exec(command);
        assert.ok(result.stderr === '', 'No errors during execution');
    });

program.parse(process.argv);
