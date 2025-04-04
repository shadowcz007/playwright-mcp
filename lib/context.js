"use strict";
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const playwright = __importStar(require("playwright"));
const yaml_1 = __importDefault(require("yaml"));
const utils_1 = require("./tools/utils");
class Context {
    _options;
    _browser;
    _browserContext;
    _tabs = [];
    _currentTab;
    constructor(options) {
        this._options = options;
    }
    tabs() {
        return this._tabs;
    }
    currentTab() {
        if (!this._currentTab)
            throw new Error('Navigate to a location to create a tab');
        return this._currentTab;
    }
    async newTab() {
        const browserContext = await this._ensureBrowserContext();
        const page = await browserContext.newPage();
        this._currentTab = this._tabs.find(t => t.page === page);
        return this._currentTab;
    }
    async selectTab(index) {
        this._currentTab = this._tabs[index - 1];
        await this._currentTab.page.bringToFront();
    }
    async ensureTab() {
        if (this._currentTab)
            return this._currentTab;
        const context = await this._ensureBrowserContext();
        await context.newPage();
        return this._currentTab;
    }
    async listTabs() {
        if (!this._tabs.length)
            return 'No tabs open';
        const lines = ['Open tabs:'];
        for (let i = 0; i < this._tabs.length; i++) {
            const tab = this._tabs[i];
            const title = await tab.page.title();
            const url = tab.page.url();
            const current = tab === this._currentTab ? ' (current)' : '';
            lines.push(`- ${i + 1}:${current} [${title}] (${url})`);
        }
        return lines.join('\n');
    }
    async closeTab(index) {
        const tab = index === undefined ? this.currentTab() : this._tabs[index - 1];
        await tab.page.close();
        return await this.listTabs();
    }
    _onPageCreated(page) {
        const tab = new Tab(this, page, tab => this._onPageClosed(tab));
        this._tabs.push(tab);
        if (!this._currentTab)
            this._currentTab = tab;
    }
    _onPageClosed(tab) {
        this._tabs = this._tabs.filter(t => t !== tab);
        if (this._currentTab === tab)
            this._currentTab = this._tabs[0];
        const browser = this._browser;
        if (this._browserContext && !this._tabs.length) {
            void this._browserContext.close().then(() => browser?.close()).catch(() => { });
            this._browser = undefined;
            this._browserContext = undefined;
        }
    }
    async install() {
        const channel = this._options.launchOptions?.channel ?? this._options.browserName ?? 'chrome';
        const cli = path_1.default.join(require.resolve('playwright/package.json'), '..', 'cli.js');
        const child = (0, child_process_1.fork)(cli, ['install', channel], {
            stdio: 'pipe',
        });
        const output = [];
        child.stdout?.on('data', data => output.push(data.toString()));
        child.stderr?.on('data', data => output.push(data.toString()));
        return new Promise((resolve, reject) => {
            child.on('close', code => {
                if (code === 0)
                    resolve(channel);
                else
                    reject(new Error(`Failed to install browser: ${output.join('')}`));
            });
        });
    }
    async close() {
        if (!this._browserContext)
            return;
        await this._browserContext.close();
    }
    async _ensureBrowserContext() {
        if (!this._browserContext) {
            const context = await this._createBrowserContext();
            this._browser = context.browser;
            this._browserContext = context.browserContext;
            this._browserContext.on('page', page => this._onPageCreated(page));
        }
        return this._browserContext;
    }
    async _createBrowserContext() {
        if (this._options.remoteEndpoint) {
            const url = new URL(this._options.remoteEndpoint);
            if (this._options.browserName)
                url.searchParams.set('browser', this._options.browserName);
            if (this._options.launchOptions)
                url.searchParams.set('launch-options', JSON.stringify(this._options.launchOptions));
            const browser = await playwright[this._options.browserName ?? 'chromium'].connect(String(url));
            const browserContext = await browser.newContext();
            return { browser, browserContext };
        }
        if (this._options.cdpEndpoint) {
            const browser = await playwright.chromium.connectOverCDP(this._options.cdpEndpoint);
            const browserContext = browser.contexts()[0];
            return { browser, browserContext };
        }
        const browserContext = await this._launchPersistentContext();
        return { browserContext };
    }
    async _launchPersistentContext() {
        try {
            const browserType = this._options.browserName ? playwright[this._options.browserName] : playwright.chromium;
            return await browserType.launchPersistentContext(this._options.userDataDir, this._options.launchOptions);
        }
        catch (error) {
            if (error.message.includes('Executable doesn\'t exist'))
                throw new Error(`Browser specified in your config is not installed. Either install it (likely) or change the config.`);
            throw error;
        }
    }
}
exports.Context = Context;
class Tab {
    context;
    page;
    _console = [];
    _fileChooser;
    _snapshot;
    _onPageClose;
    constructor(context, page, onPageClose) {
        this.context = context;
        this.page = page;
        this._onPageClose = onPageClose;
        page.on('console', event => this._console.push(event));
        page.on('framenavigated', frame => {
            if (!frame.parentFrame())
                this._console.length = 0;
        });
        page.on('close', () => this._onClose());
        page.on('filechooser', chooser => this._fileChooser = chooser);
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(5000);
    }
    _onClose() {
        this._fileChooser = undefined;
        this._console.length = 0;
        this._onPageClose(this);
    }
    async navigate(url) {
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        // Cap load event to 5 seconds, the page is operational at this point.
        await this.page.waitForLoadState('load', { timeout: 5000 }).catch(() => { });
    }
    async run(callback, options) {
        try {
            if (!options?.noClearFileChooser)
                this._fileChooser = undefined;
            if (options?.waitForCompletion)
                await (0, utils_1.waitForCompletion)(this.page, () => callback(this));
            else
                await callback(this);
        }
        finally {
            if (options?.captureSnapshot)
                this._snapshot = await PageSnapshot.create(this.page);
        }
        const tabList = this.context.tabs().length > 1 ? await this.context.listTabs() + '\n\nCurrent tab:' + '\n' : '';
        const snapshot = this._snapshot?.text({ status: options?.status, hasFileChooser: !!this._fileChooser }) ?? options?.status ?? '';
        return {
            content: [{
                    type: 'text',
                    text: tabList + snapshot,
                }],
        };
    }
    async runAndWait(callback, options) {
        return await this.run(callback, {
            waitForCompletion: true,
            ...options,
        });
    }
    async runAndWaitWithSnapshot(callback, options) {
        return await this.run(callback, {
            captureSnapshot: true,
            waitForCompletion: true,
            ...options,
        });
    }
    lastSnapshot() {
        if (!this._snapshot)
            throw new Error('No snapshot available');
        return this._snapshot;
    }
    async console() {
        return this._console;
    }
    async submitFileChooser(paths) {
        if (!this._fileChooser)
            throw new Error('No file chooser visible');
        await this._fileChooser.setFiles(paths);
        this._fileChooser = undefined;
    }
}
class PageSnapshot {
    _frameLocators = [];
    _text;
    constructor() {
    }
    static async create(page) {
        const snapshot = new PageSnapshot();
        await snapshot._build(page);
        return snapshot;
    }
    text(options) {
        const results = [];
        if (options?.status) {
            results.push(options.status);
            results.push('');
        }
        if (options?.hasFileChooser) {
            results.push('- There is a file chooser visible that requires browser_choose_file to be called');
            results.push('');
        }
        results.push(this._text);
        return results.join('\n');
    }
    async _build(page) {
        const yamlDocument = await this._snapshotFrame(page);
        const lines = [];
        lines.push(`- Page URL: ${page.url()}`, `- Page Title: ${await page.title()}`);
        lines.push(`- Page Snapshot`, '```yaml', yamlDocument.toString().trim(), '```', '');
        this._text = lines.join('\n');
    }
    async _snapshotFrame(frame) {
        const frameIndex = this._frameLocators.push(frame) - 1;
        const snapshotString = await frame.locator('body').ariaSnapshot({ ref: true });
        const snapshot = yaml_1.default.parseDocument(snapshotString);
        const visit = async (node) => {
            if (yaml_1.default.isPair(node)) {
                await Promise.all([
                    visit(node.key).then(k => node.key = k),
                    visit(node.value).then(v => node.value = v)
                ]);
            }
            else if (yaml_1.default.isSeq(node) || yaml_1.default.isMap(node)) {
                node.items = await Promise.all(node.items.map(visit));
            }
            else if (yaml_1.default.isScalar(node)) {
                if (typeof node.value === 'string') {
                    const value = node.value;
                    if (frameIndex > 0)
                        node.value = value.replace('[ref=', `[ref=f${frameIndex}`);
                    if (value.startsWith('iframe ')) {
                        const ref = value.match(/\[ref=(.*)\]/)?.[1];
                        if (ref) {
                            try {
                                const childSnapshot = await this._snapshotFrame(frame.frameLocator(`aria-ref=${ref}`));
                                return snapshot.createPair(node.value, childSnapshot);
                            }
                            catch (error) {
                                return snapshot.createPair(node.value, '<could not take iframe snapshot>');
                            }
                        }
                    }
                }
            }
            return node;
        };
        await visit(snapshot.contents);
        return snapshot;
    }
    refLocator(ref) {
        let frame = this._frameLocators[0];
        const match = ref.match(/^f(\d+)(.*)/);
        if (match) {
            const frameIndex = parseInt(match[1], 10);
            frame = this._frameLocators[frameIndex];
            ref = match[2];
        }
        if (!frame)
            throw new Error(`Frame does not exist. Provide ref from the most current snapshot.`);
        return frame.locator(`aria-ref=${ref}`);
    }
}
