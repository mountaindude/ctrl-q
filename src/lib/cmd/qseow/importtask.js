import xlsx from 'node-xlsx';
import { parse } from 'csv-parse';
import fs from 'node:fs';

import { logger, setLoggingLevel, isSea, execPath, verifyFileSystemExists, isNumeric } from '../../../globals.js';
import { QlikSenseTasks } from '../../task/class_alltasks.js';
import { QlikSenseApps } from '../../app/class_allapps.js';
import { getTaskColumnPosFromHeaderRow } from '../../util/qseow/lookups.js';
import { getTagsFromQseow } from '../../util/qseow/tag.js';
import { getCustomPropertiesFromQseow } from '../../util/qseow/customproperties.js';
import { catchLog } from '../../util/log.js';

const getHeaders = async (options) => {
    const records = [];

    const parser = fs.createReadStream(options.fileName).pipe(
        parse({
            info: true,
            skip_empty_lines: true,
        })
    );

    // Get the header row
    for await (const record of parser) {
        if (record.info.lines === 1) {
            // Header row
            records.push(record.record);
        }
    }

    return records;
};

const processCsvFile = async (options) => {
    const headers = await getHeaders(options);

    const headerRow = [];

    // Push all column headers to array
    for (const record of headers[0]) {
        // Get each column header text
        headerRow.push(record);
    }

    // Get positions of column headers
    const colHeaders = getTaskColumnPosFromHeaderRow(headerRow);

    const records = [];
    const parser = fs.createReadStream(options.fileName).pipe(
        parse({
            info: true,
            skip_empty_lines: true,
            cast(value, context) {
                // Ensure all data read from CSV file has valid types and values
                // Cast strings to numbers where applicable, etc
                if (context.lines === 1) {
                    // We're in the header row
                    return value;
                }

                // "Task counter" column. Should be integer
                if (context.column === colHeaders.taskCounter.pos) {
                    if (typeof value !== 'string' || !isNumeric(value)) {
                        logger.error(`PARSING CSV: Column "${colHeaders.taskCounter.name}" contains a non-integer value. Exiting.`);
                        process.exit(1);
                    } else {
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.taskEnabled.pos) {
                    // 0, 1 or empty
                    if (typeof value !== 'string' || !(value === '0' || value === '1' || value.trim() === '')) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.taskEnabled.name}" should be 0, 1 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value === '1') {
                            return true;
                        }
                        if (value === '0' || value.trim() === '') {
                            return false;
                        }
                    }
                }
                if (context.column === colHeaders.taskSessionTimeout.pos) {
                    // Integer greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) > 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.taskSessionTimeout.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.taskMaxRetries.pos) {
                    // Integer equal to or greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) >= 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.taskMaxRetries.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.isPartialReload.pos) {
                    // 0, 1 or empty
                    if (typeof value !== 'string' || !(value === '0' || value === '1' || value.trim() === '')) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.isPartialReload.name}" should be 0, 1 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value === '1') {
                            return true;
                        }
                        if (value === '0' || value.trim() === '') {
                            return false;
                        }
                    }
                }
                if (context.column === colHeaders.isManuallyTriggered.pos) {
                    // 0, 1 or empty
                    if (typeof value !== 'string' || !(value === '0' || value === '1' || value.trim() === '')) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.isManuallyTriggered.name}" should be 0, 1 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value === '1') {
                            return true;
                        }
                        if (value === '0' || value.trim() === '') {
                            return false;
                        }
                    }
                }
                if (context.column === colHeaders.eventCounter.pos) {
                    // Integer greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) > 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.eventCounter.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.eventEnabled.pos) {
                    // 0, 1 or empty
                    if (typeof value !== 'string' || !(value === '0' || value === '1' || value.trim() === '')) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.eventEnabled.name}" should be 0, 1 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value === '1') {
                            return true;
                        }
                        if (value === '0' || value.trim() === '') {
                            return false;
                        }
                    }
                }
                if (context.column === colHeaders.timeConstraintSeconds.pos) {
                    // Integer equal to or greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) >= 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.timeConstraintSeconds.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.timeConstraintMinutes.pos) {
                    // Integer equal to or greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) >= 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.timeConstraintMinutes.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.timeConstraintHours.pos) {
                    // Integer equal to or greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) >= 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.timeConstraintHours.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.timeConstraintDays.pos) {
                    // Integer equal to or greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) >= 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.timeConstraintDays.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }
                if (context.column === colHeaders.ruleCounter.pos) {
                    // Integer greater than 0 or empty
                    if (
                        typeof value !== 'string' ||
                        (value.trim().length > 0 && !isNumeric(value)) ||
                        !(parseInt(value, 10) > 0 || value.trim() === '')
                    ) {
                        logger.error(
                            `PARSING CSV: Column "${colHeaders.ruleCounter.name}" should be greather than 0 or empty. Current value is "${value}". Exiting.`
                        );
                        process.exit(1);
                    } else {
                        if (value.trim() === '') {
                            return '';
                        }
                        return parseInt(value, 10);
                    }
                }

                return value;
            },
        })
    );

    for await (const record of parser) {
        // ALways add the header line
        if (record.info.lines === 1) {
            // Header row
            records.push(record.record);
        } else if (parseInt(options.limitImportCount, 10) > 0) {
            // Is there an import limit specified?
            if (record.record[colHeaders.taskCounter.pos] <= parseInt(options.limitImportCount, 10)) {
                records.push(record.record);
            }
        } else {
            records.push(record.record);
        }
    }

    return records;
};

export async function importTaskFromFile(options) {
    try {
        // Set log level
        setLoggingLevel(options.logLevel);

        logger.verbose(`Ctrl-Q was started as a stand-alone binary: ${isSea}`);
        logger.verbose(`Ctrl-Q was started from ${execPath}`);

        logger.info(`Import tasks from definitions in file "${options.fileName}"`);
        logger.debug(`Options: ${JSON.stringify(options, null, 2)}`);

        // Get all tags
        const tagsExisting = await getTagsFromQseow(options);

        // Get all custom properties
        const cpExisting = await getCustomPropertiesFromQseow(options);
        logger.info(`Successfully retrieved ${cpExisting.length} custom properties from QSEoW`);

        // Verify task definitions file exists
        const taskFileExists = await verifyFileSystemExists(options.fileName);
        if (taskFileExists === false) {
            logger.error(`Missing task file "${options.fileName}". Aborting`);
            process.exit(1);
        } else {
            logger.verbose(`Task file "${options.fileName}" found`);
        }

        let tasksFromFile = null;
        let appsFromFile = null;

        if (options.fileType === 'csv') {
            // Parse CSV file
            const tmpTasksFromFile = await processCsvFile(options);
            if (tmpTasksFromFile) {
                // Some tasks were read from CSV.
                // Build data structure to be used by later parts of the script
                tasksFromFile = {
                    name: 'Ctrl-Q task import from CSV',
                    data: [],
                };

                for (const item of tmpTasksFromFile) {
                    tasksFromFile.data.push(item);
                }
            }

            // All columns read from the CSV will be strings.
            // Convert columns that should be integers to just that. Also ensure all values are valid numbers.
        } else if (options.fileType === 'excel') {
            // Parse Excel file
            const workSheetsFromFile = xlsx.parse(options.fileName);

            // Verify that task definitions sheet exists
            tasksFromFile = workSheetsFromFile.find((item) => item.name === options.sheetName);
            if (!tasksFromFile) {
                throw new Error(`EXCEL IMPORT: Can't find sheet ${options.sheetName} in file ${options.fileName}`);
            }

            // Is there an import limit specified?
            // If so only include the first --limit-import-count tasks
            if (parseInt(options.limitImportCount, 10) > 0) {
                // Get positions of column headers
                const colHeaders = getTaskColumnPosFromHeaderRow(tasksFromFile.data[0]);

                const limitedTasks = tasksFromFile.data.filter((task) => {
                    // Are we on header line?
                    if (task[colHeaders.taskCounter.pos] === colHeaders.taskCounter.name) {
                        // This is the header
                        return true;
                    }

                    // Only keep first x tasks
                    if (task[colHeaders.taskCounter.pos] <= parseInt(options.limitImportCount, 10)) {
                        return true;
                    }
                    return false;
                });

                // Copy limited set of tasks to original variable that will be used during task import
                tasksFromFile.data = [];
                tasksFromFile.data.push(...limitedTasks);
            }

            // If apps should be imported: Verify that app import sheet exists
            if (options.importApp) {
                appsFromFile = workSheetsFromFile.find((item) => item.name === options.importAppSheetName);
                if (!appsFromFile) {
                    throw new Error(`EXCEL IMPORT: Can't find sheet ${options.importAppSheetName} in file ${options.fileName}`);
                }
            }
        }

        // All definitions now loaded from source file
        let importedApps;

        if (options.importApp) {
            // If apps should be imported that's the should be done before tasks are imported
            const qlikSenseApps = new QlikSenseApps();
            await qlikSenseApps.init(options);

            // Import apps specified in Excel file
            importedApps = await qlikSenseApps.importAppsFromFiles(appsFromFile, tagsExisting, cpExisting);
        }

        // Set up new reload task object
        const qlikSenseTasks = new QlikSenseTasks();
        await qlikSenseTasks.init(options, importedApps);
        const taskList = await qlikSenseTasks.getTaskModelFromFile(tasksFromFile, tagsExisting, cpExisting, options);

        if (taskList) {
            return taskList;
        }
        return false;
    } catch (err) {
        catchLog('IMPORT TASK 2', err);
    }
}
