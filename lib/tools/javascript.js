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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeJavaScript = void 0;
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const executeJavaScriptSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .describe('JavaScript code to execute in the browser context'),
    timeout: zod_1.z
        .number()
        .optional()
        .describe('Timeout in milliseconds for the script execution (default: 30000)')
});
exports.executeJavaScript = {
    schema: {
        name: 'browser_execute_javascript',
        description: 'Execute JavaScript code in the browser context and return the result',
        inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(executeJavaScriptSchema)
    },
    handle: async (context, params) => {
        const validatedParams = executeJavaScriptSchema.parse(params);
        const tab = context.currentTab();
        try {
            // 使用evaluateHandle来执行JavaScript代码，并获取结果
            const result = await tab.page.evaluate(async (code) => {
                try {
                    // 使用Function构造函数来执行代码并返回结果
                    // eslint-disable-next-line no-new-func
                    const executeFunction = new Function(`
              try {
                return {
                  success: true,
                  result: (() => { ${code} })()
                };
              } catch (error) {
                return {
                  success: false,
                  error: error instanceof Error ? error.toString() : String(error)
                };
              }
            `);
                    return executeFunction();
                }
                catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.toString() : String(error)
                    };
                }
            }, validatedParams.code);
            // 设置超时
            if (validatedParams.timeout) {
                tab.page.setDefaultTimeout(validatedParams.timeout);
            }
            if (result.success) {
                // 尝试将结果转换为字符串
                let resultText;
                try {
                    if (result.result === undefined) {
                        resultText = 'undefined';
                    }
                    else if (result.result === null) {
                        resultText = 'null';
                    }
                    else if (typeof result.result === 'object') {
                        resultText = JSON.stringify(result.result, null, 2);
                    }
                    else {
                        resultText = String(result.result);
                    }
                }
                catch (error) {
                    resultText = `${error instanceof Error ? error.toString() : String(error)}`;
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: resultText
                        }
                    ]
                };
            }
            else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: result.error
                        }
                    ],
                    isError: true
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: error instanceof Error ? error.toString() : String(error)
                    }
                ],
                isError: true
            };
        }
    }
};
