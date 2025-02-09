import enigma from 'enigma.js';
import { setupEnigmaConnection, addTrafficLogging } from '../../util/qseow/enigma_util.js';
import { logger, setLoggingLevel, isSea, execPath } from '../../../globals.js';
import { catchLog } from '../../util/log.js';

// Variable to keep track of how many dimensions have been deleted
let deleteCount = 0;

/**
 *
 * @param {*} options
 */
export async function deleteMasterDimension(options) {
    try {
        // Set log level
        setLoggingLevel(options.logLevel);

        logger.verbose(`Ctrl-Q was started as a stand-alone binary: ${isSea}`);
        logger.verbose(`Ctrl-Q was started from ${execPath}`);

        logger.info('Delete master dimensions');
        logger.debug(`Options: ${JSON.stringify(options, null, 2)}`);

        // Session ID to use when connecting to the Qlik Sense server
        const sessionId = 'ctrlq';

        // Create new session to Sense engine
        let configEnigma;
        let session;
        try {
            configEnigma = await setupEnigmaConnection(options, sessionId);
            session = await enigma.create(configEnigma);
            logger.verbose(`Created session to server ${options.host}.`);
        } catch (err) {
            catchLog(`Error creating session to server ${options.host}`, err);
            process.exit(1);
        }

        // Set up logging of websocket traffic
        addTrafficLogging(session, options);

        let global;
        try {
            global = await session.open();
        } catch (err) {
            catchLog(`Error opening session to server ${options.host}`, err);
            process.exit(1);
        }

        let engineVersion;
        try {
            engineVersion = await global.engineVersion();
            logger.verbose(`Server ${options.host} has engine version ${engineVersion.qComponentVersion}.`);
        } catch (err) {
            catchLog(`Error getting engine version from server ${options.host}`, err);
            process.exit(1);
        }

        const app = await global.openDoc(options.appId, '', '', '', false);
        logger.verbose(`Opened app ${options.appId}.`);

        // Get master dimensions
        // https://help.qlik.com/en-US/sense-developer/May2021/APIs/EngineAPI/definitions-NxLibraryDimensionDef.html
        const dimensionCall = {
            qInfo: {
                qId: 'DimensionObjectExt',
                qType: 'DimensionListExt',
            },
            qDimensionListDef: {
                qType: 'dimension',
                qData: {
                    dim: '/qDim',
                    info: '/qDimInfos',
                    // grouping: '/qDim/qGrouping',
                    // title: '/qMetaDef/title',
                    // tags: '/qMetaDef/tags',
                    // expression: '/qDim',
                    // description: '/qMetaDef/description',
                },
            },
        };

        const genericDimObj = await app.createSessionObject(dimensionCall);
        const dimObj = await genericDimObj.getLayout();

        // Get list of all IDs that should be deleted
        let deleteMasterItems = [];

        if (options.deleteAll || options.masterItem === undefined) {
            // Delete all master item dimensions
            deleteMasterItems = deleteMasterItems.concat(dimObj.qDimensionList.qItems);
        } else {
            // Loop over all master items (identified by name or ID) we should get data for
            // eslint-disable-next-line no-restricted-syntax
            for (const masterItem of options.masterItem) {
                // Can we find this master item in the list retrieved from the app?
                if (options.idType === 'name') {
                    const items = dimObj.qDimensionList.qItems.filter((item) => item.qMeta.title === masterItem);
                    if (items.length > 0) {
                        // We've found the dimension that's to be retrieved.
                        deleteMasterItems = deleteMasterItems.concat(items);
                    } else {
                        logger.warn(`Master item dimension "${masterItem}" not found`);
                    }
                } else if (options.idType === 'id') {
                    const items = dimObj.qDimensionList.qItems.filter((item) => item.qInfo.qId === masterItem);
                    if (items.length > 0) {
                        // We've found the dimension that's to be retrieved.
                        deleteMasterItems = deleteMasterItems.concat(items);
                    } else {
                        logger.warn(`Master item dimension "${masterItem}" not found`);
                    }
                } else {
                    throw Error('Invalid --id-type value');
                }
            }
        }

        logger.debug(`Master item dimensions to be deleted: ${JSON.stringify(deleteMasterItems)}`);

        if (deleteMasterItems.length === 0) {
            logger.warn(`No matching master item dimensions found`);
        } else {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of deleteMasterItems) {
                if (options.dryRun === undefined || options.dryRun === false) {
                    // eslint-disable-next-line no-await-in-loop
                    const res = await app.destroyDimension(item.qInfo.qId);
                    if (res !== true) {
                        logger.error(`Failed deleting dimension "${item.qMeta.title}", id=${item.qInfo.qId} in app "${item.qInfo.qId}"`);
                    } else {
                        deleteCount += 1;
                        logger.info(
                            `(${deleteCount}/${deleteMasterItems.length}) Deleted master item dimension "${item.qMeta.title}", id=${item.qInfo.qId} in app "${options.appId}"`
                        );
                    }
                } else {
                    logger.info(`DRY RUN: Delete of master item dimension "${item.qMeta.title}", id=${item.qInfo.qId} would happen here`);
                }
            }
        }

        if ((await app.destroySessionObject(genericDimObj.id)) === true) {
            logger.debug(`Destroyed session object after managing master items in app ${options.appId} on host ${options.host}`);

            if ((await session.close()) === true) {
                logger.verbose(`Closed session after managing master dimension(s) in app ${options.appId} on host ${options.host}`);
            } else {
                logger.error(`Error closing session for app ${options.appId} on host ${options.host}`);
            }
        } else {
            logger.error(`Error destroying session object for master dimenions`);
        }
    } catch (err) {
        catchLog('Error in deleteMasterDimension', err);
    }
}
