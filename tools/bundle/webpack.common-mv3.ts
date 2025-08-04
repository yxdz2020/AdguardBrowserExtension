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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CopyWebpackPlugin from 'copy-webpack-plugin';
import { type Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import HtmlWebpackPlugin from 'html-webpack-plugin';

import { RulesetsInjector } from '@adguard/dnr-rulesets';

import {
    BACKGROUND_OUTPUT,
    BLOCKING_BLOCKED_OUTPUT,
    CONTENT_SCRIPT_START_OUTPUT,
    GPC_SCRIPT_OUTPUT,
    HIDE_DOCUMENT_REFERRER_OUTPUT,
    INDEX_HTML_FILE_NAME,
} from '../../constants';
import {
    BUILD_ENV,
    FILTERS_DEST,
    MV3_BROWSER_TO_ASSETS_FILTERS_BROWSER_MAP,
} from '../constants';
import { updateManifestBuffer } from '../helpers';

import {
    BACKGROUND_PATH,
    BLOCKING_BLOCKED_PATH,
    CONTENT_SCRIPT_START_PATH,
    htmlTemplatePluginCommonOptions,
    type BrowserConfig,
} from './common-constants';
import { commonManifest } from './manifest.common';
import {
    CHROMIUM_DEVTOOLS_ENTRIES,
    CHROMIUM_DEVTOOLS_PAGES_PLUGINS,
    genCommonConfig,
} from './webpack.common';
import { isBrowserMv3 } from './helpers';

/* eslint-disable @typescript-eslint/naming-convention */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable @typescript-eslint/naming-convention */

const GPC_SCRIPT_PATH = path.resolve(__dirname, '../../Extension/pages/gpc');
const HIDE_DOCUMENT_REFERRER_SCRIPT_PATH = path.resolve(__dirname, '../../Extension/pages/hide-document-referrer');

/**
 * Ruleset name prefix - it is used to identify ruleset files.
 */
const RULESET_NAME_PREFIX = 'ruleset_';

/**
 * Base filter id - it is the main filter that is enabled by default.
 */
const BASE_FILTER_ID = '2';

/**
 * Instance of {@link RulesetsInjector} for injecting rulesets into the extension manifest.
 */
const rulesetsInjector = new RulesetsInjector();

/**
 * Generates a common Webpack configuration for MV3 browsers.
 *
 * @param browserConfig Browser configuration object.
 * @param manifest The manifest to use for the browser.
 * @param isWatchMode Whether the configuration is for watch mode.
 *
 * @returns A Webpack configuration object.
 *
 * @throws If the browser is not supported for MV3 configuration.
 * @throws If output path is undefined in common config.
 */
export const genMv3CommonConfig = (
    browserConfig: BrowserConfig,
    manifest: any,
    isWatchMode = false,
): Configuration => {
    const { browser, buildDir } = browserConfig;

    if (!isBrowserMv3(browser)) {
        throw new Error(`Browser ${browser} is not supported for MV3 configuration.`);
    }

    const assetsFiltersBrowser = MV3_BROWSER_TO_ASSETS_FILTERS_BROWSER_MAP[browser];
    const commonConfig = genCommonConfig(browserConfig, isWatchMode);

    if (!commonConfig?.output?.path) {
        throw new Error('commonConfig.output.path is undefined');
    }

    const transformManifest = (content: Buffer) => {
        const filtersDest = FILTERS_DEST.replace('%browser', path.join(assetsFiltersBrowser, '/declarative'));

        const filters = fs
            .readdirSync(filtersDest)
            .filter((filter) => filter.match(/ruleset_\d+/));

        return updateManifestBuffer(
            BUILD_ENV,
            browser,
            content,
            rulesetsInjector.applyRulesets(
                (id: string) => `filters/declarative/${id}/${id}.json`,
                manifest,
                filters,
                {
                    forceUpdate: true,
                    enable: [BASE_FILTER_ID],
                    rulesetPrefix: RULESET_NAME_PREFIX,
                },
            ),
        );
    };

    return merge(commonConfig, {
        devtool: BUILD_ENV === 'dev' ? 'inline-source-map' : false,
        entry: {
            // Don't needed to specify chunks for MV3, because Service workers
            // in MV3 must be a single file as they run in a short-lived
            // execution environment (they are terminated when idle) and cannot
            // use eval, importScripts, or external scripts dynamically
            [BACKGROUND_OUTPUT]: {
                import: BACKGROUND_PATH,
                runtime: false,
            },
            [BLOCKING_BLOCKED_OUTPUT]: {
                import: BLOCKING_BLOCKED_PATH,
            },
            [CONTENT_SCRIPT_START_OUTPUT]: {
                import: path.resolve(CONTENT_SCRIPT_START_PATH, 'mv3.ts'),
                runtime: false,
            },
            [GPC_SCRIPT_OUTPUT]: {
                import: GPC_SCRIPT_PATH,
                runtime: false,
            },
            [HIDE_DOCUMENT_REFERRER_OUTPUT]: {
                import: HIDE_DOCUMENT_REFERRER_SCRIPT_PATH,
                runtime: false,
            },
            ...CHROMIUM_DEVTOOLS_ENTRIES,
        },
        output: {
            path: path.join(commonConfig.output.path, buildDir),
        },
        plugins: [
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(BLOCKING_BLOCKED_PATH, INDEX_HTML_FILE_NAME),
                filename: `${BLOCKING_BLOCKED_OUTPUT}.html`,
                chunks: [BLOCKING_BLOCKED_OUTPUT],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        /**
                         * This is a dummy import to keep "clean" usage of
                         * `CopyWebpackPlugin`. We actually use `commonManifest`
                         * imported above.
                         */
                        from: path.resolve(__dirname, './manifest.common.ts'),
                        to: 'manifest.json',
                        transform: () => {
                            return transformManifest(Buffer.from(JSON.stringify(commonManifest)));
                        },
                    },
                    {
                        context: 'Extension',
                        from: `filters/${assetsFiltersBrowser}`,
                        to: 'filters',
                    },
                ],
            }),
            ...CHROMIUM_DEVTOOLS_PAGES_PLUGINS,
        ],
    });
};
