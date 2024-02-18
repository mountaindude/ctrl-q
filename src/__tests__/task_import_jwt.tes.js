/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
const { test, expect, describe } = require('@jest/globals');

const { importTaskFromFile } = require('../lib/cmd/importtask');
const { getTaskById, deleteExternalProgramTaskById, deleteReloadTaskById } = require('../lib/util/task');
const { mapTaskType } = require('../lib/util/lookups');

const options = {
    logLevel: process.env.CTRL_Q_LOG_LEVEL || 'info',
    authType: process.env.CTRL_Q_AUTH_TYPE || 'cert',
    host: process.env.CTRL_Q_HOST || '',
    port: process.env.CTRL_Q_PORT || '4242',
    schemaVersion: process.env.CTRL_Q_SCHEMA_VERSION || '12.612.0',
    virtualProxy: process.env.CTRL_Q_VIRTUAL_PROXY || '',
    secure: process.env.CTRL_Q_SECURE || true,
    authUserDir: process.env.CTRL_Q_AUTH_USER_DIR || '',
    authUserId: process.env.CTRL_Q_AUTH_USER_ID || '',
    updateMode: process.env.CTRL_Q_UPDATE_MODE || 'create',
    authJwt: process.env.CTRL_Q_AUTH_JWT || '',
};

const defaultTestTimeout = process.env.CTRL_Q_TEST_TIMEOUT || 600000; // 10 minute default timeout
jest.setTimeout(defaultTestTimeout);

// Test suite for task import
describe('import task (jwt auth)', () => {
    options.authType = 'jwt';
    options.port = '443';
    options.virtualProxy = 'jwt';

    test('get tasks (verify parameters)', async () => {
        expect(options.host).not.toHaveLength(0);
        expect(options.authUserDir).not.toHaveLength(0);
        expect(options.authUserId).not.toHaveLength(0);
    });

    test('csv 1: reload task, no triggers', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-1.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(1);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteReloadTaskById(taskId, options);
        }
    });

    test('csv 2: reload task, 1 schema trigger', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-2.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(1);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteReloadTaskById(taskId, options);
        }
    });

    test('csv 3: reload task, 1 composite trigger', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-3.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(1);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteReloadTaskById(taskId, options);
        }
    });

    test('csv 4: 2 reload tasks, composite & schema triggers', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-4.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 2
        expect(result).not.toBe(false);
        expect(result.length).toBe(2);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteReloadTaskById(taskId, options);
        }
    });

    test('csv 5: 1 ext program task, schema trigger', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-5.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(1);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteExternalProgramTaskById(taskId, options);
        }
    });

    test('csv 6: 1 ext program task, composite trigger', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-6.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(1);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            await deleteExternalProgramTaskById(taskId, options);
        }
    });

    test('csv 7: complex. many schema and composite triggers', async () => {
        const inputDir = './testdata';
        const inputFile = `tasks-7.csv`;

        options.fileType = 'csv';
        options.fileName = `${inputDir}/${inputFile}`;

        const result = await importTaskFromFile(options);

        // Result should be array with length 1
        expect(result).not.toBe(false);
        expect(result.length).toBe(18);

        // Delete all tasks in array
        for (let i = 0; i < result.length; i += 1) {
            const task = result[i];
            const { taskId } = task;

            // Call getTaskById to verify that task exists and what task type it is
            const task2 = await getTaskById(taskId, options);
            const taskType = mapTaskType.get(task2.taskType);

            // taskType should be 'Reload' or 'External Program'
            if (taskType === 'Reload') {
                await deleteReloadTaskById(taskId, options);
            } else if (taskType === 'ExternalProgram') {
                await deleteExternalProgramTaskById(taskId, options);
            }
        }
    });
});