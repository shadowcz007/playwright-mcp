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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const server_1 = require("./server");
const snapshot = __importStar(require("./tools/snapshot"));
const common = __importStar(require("./tools/common"));
const screenshot = __importStar(require("./tools/screenshot"));
const tabs = __importStar(require("./tools/tabs"));
const javascript = __importStar(require("./tools/javascript"));
const console_1 = require("./resources/console");
const commonTools = [
    common.wait,
    common.pdf,
    common.close,
    common.install,
    tabs.listTabs,
    tabs.newTab,
    javascript.executeJavaScript,
];
const snapshotTools = [
    common.navigate(true),
    snapshot.snapshot,
    snapshot.click,
    snapshot.hover,
    snapshot.type,
    snapshot.selectOption,
    snapshot.screenshot,
    common.goBack(true),
    common.goForward(true),
    common.chooseFile(true),
    common.pressKey(true),
    ...commonTools,
    tabs.selectTab(true),
    tabs.closeTab(true),
];
const screenshotTools = [
    common.navigate(false),
    screenshot.screenshot,
    screenshot.moveMouse,
    screenshot.click,
    screenshot.drag,
    screenshot.type,
    common.goBack(false),
    common.goForward(false),
    common.chooseFile(false),
    common.pressKey(false),
    ...commonTools,
    tabs.selectTab(false),
    tabs.closeTab(false),
];
const resources = [
    console_1.console,
];
const packageJSON = require('../package.json');
function createServer(options) {
    const tools = options?.vision ? screenshotTools : snapshotTools;
    return (0, server_1.createServerWithTools)({
        name: 'Playwright',
        version: packageJSON.version,
        tools,
        resources,
        browserName: options?.browserName,
        userDataDir: options?.userDataDir ?? '',
        launchOptions: options?.launchOptions,
        cdpEndpoint: options?.cdpEndpoint,
    });
}
