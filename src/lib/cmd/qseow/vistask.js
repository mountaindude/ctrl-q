import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import handlebars from 'handlebars';
import { Readable } from 'node:stream';
import sea from 'node:sea';

import { appVersion, logger, setLoggingLevel, isSea, execPath, verifyFileSystemExists, verifySeaAssetExists } from '../../../globals.js';
import { QlikSenseTasks } from '../../task/class_alltasks.js';
import { findCircularTaskChains } from '../../task/find_circular_task_chain.js';
import { catchLog } from '../../util/log.js';

// js: 'application/javascript',
const MIME_TYPES = {
    default: 'application/octet-stream',
    html: 'text/html; charset=UTF-8',
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpg',
    gif: 'image/gif',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
};

// Get path to static html files
let STATIC_PATH = '';
if (isSea) {
    // Running as standalone SEA app
    STATIC_PATH = '';
} else {
    // Running Node.js script
    STATIC_PATH = path.join(execPath, './src/static');
}

const toBool = [() => true, () => false];

const templateData = {
    appVersion,
    title: 'Ctrl-Q',
    description: 'Task visualization for Ctrl-Q',
};

let taskNetwork = [];

const visOptions = {
    nodes: {
        widthConstraint: { maximum: 200 },
        // smooth: {
        //     enabled: true,
        //     type: 'dynamic',
        //     roundness: 0.5,
        // },
        font: '20px arial',
    },
    edges: {
        arrows: 'to',
        width: 5,
        smooth: false,
        font: {
            size: 22, // Increase font size for text edge labels
        },
    },
    layout: {
        randomSeed: 5.5,
        improvedLayout: true,
        clusterThreshold: 150,

        hierarchical: {
            enabled: false,
            levelSeparation: 150,
            nodeSpacing: 50,
            treeSpacing: 200,
            blockShifting: true,
            edgeMinimization: false,
            parentCentralization: false,
            direction: 'UD', // UD, DU, LR, RL
            sortMethod: 'directed', // hubsize, directed
        },
        // hierarchical: {
        //     direction: 'UD',
        //     sortMethod: 'directed',
        //     // shakeTowards: 'roots',
        //     // sortMethod: 'hubsize',
        //     // levelSeparation: 150,
        //     nodeSpacing: 50,
        //     // treeSpacing: 150,
        //     blockShifting: true,
        //     edgeMinimization: true,
        //     // parentCentralization: false,
        // },
    },
    // interaction: { dragNodes: false },
    physics: {
        enabled: true,

        stabilization: {
            enabled: true,
            iterations: 250,
            updateInterval: 25,
        },
        minVelocity: 0.75,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
            centralGravity: 0.005,
            springLength: 150,
            springConstant: 0.7,
            damping: 0.72,
            avoidOverlap: 0.5,
        },
        hierarchicalRepulsion: {
            centralGravity: 0.3,
            springLength: 230,
            springConstant: 0.8,
            nodeDistance: 150,
            damping: 0.09,
            avoidOverlap: 0.3,
        },
    },
    interaction: {
        navigationButtons: true,
        hideNodesOnDrag: false,
    },
    configure: {
        enabled: true,
        filter: 'physics, layout',
        // filter: 'physics, edges, layout, interaction',
        showButton: true,
    },
};

function getSchemaText(incrementOption, incrementDescription) {
    let schemaText = '';

    /**
     * IncrementOption:
        "0: once",
        "1: hourly",
            incrementDescription: Repeat after each 'minutes hours 0 0 '
        "2: daily",
            incrementDescription: Repeat after each '0 0 days 0 '
        "3: weekly",
        "4: monthly"
     */

    if (incrementOption === 0) {
        schemaText = 'Once';
    } else if (incrementOption === 1) {
        schemaText = 'Hourly';
    } else if (incrementOption === 2) {
        schemaText = 'Daily';
    } else if (incrementOption === 3) {
        schemaText = 'Weekly';
    } else if (incrementOption === 4) {
        schemaText = 'Monthly';
    }

    return schemaText;
}

const prepareFile = async (url) => {
    logger.verbose('-----------------------------------');
    logger.verbose(`==> Preparing file for url: ${url}`);

    const paths = [STATIC_PATH, url];
    if (url.endsWith('/')) paths.push('index.html');

    logger.verbose(`Paths: ${paths}`);

    let filePath = path.join(...paths);
    logger.verbose(`Joined path ${filePath}`);

    const pathTraversal = !filePath.startsWith(STATIC_PATH);
    logger.verbose(`Path traversal: ${pathTraversal}`);

    let exists, streamPath, ext, stream;

    if (isSea) {
        // Change any backslashes to forward slashes, as embedded assets in SEA app are stored with forward slashes
        filePath = filePath.replace(/\\/g, '/');
        logger.verbose(`Forward slashes path ${filePath}`);

        // Prepend with STATIC_PATH
        logger.verbose(`url: ${url}`);
        logger.verbose(`STATIC_PATH: ${STATIC_PATH}`);
        logger.verbose(`filePath: ${filePath}`);
        try {
            exists = verifySeaAssetExists(filePath);
            logger.verbose(`SEA file exists: ${exists}`);
            if (exists) {
                ext = path.extname(filePath).substring(1).toLowerCase();
                logger.verbose(`SEA file extension: ${ext}`);

                if (ext === 'html' || ext === 'js' || ext === 'css') {
                    const asset = sea.getAsset(filePath, 'utf8');
                    logger.verbose(`Asset type: ${typeof asset}`);

                    stream = Readable.from([asset]);
                } else if (ext === 'png' || ext === 'jpg' || ext === 'gif' || ext === 'ico') {
                    let asset = sea.getAsset(filePath);

                    if (asset instanceof ArrayBuffer) {
                        asset = Buffer.from(asset);
                    }
                    stream = Readable.from([asset]);
                } else {
                    logger.warn(`File extension not supported: ${ext}`);
                    exists = false;
                }

                streamPath = filePath;
            } else {
                logger.error(`Asset not found: ${filePath}`);
                throw new Error('Asset not found');
            }
        } catch (error) {
            logger.error(`Error while getting SEA asset: ${error}`);
            exists = false;
            streamPath = `${STATIC_PATH}/404.html`;
            ext = 'html';
            stream = Readable.from(['<h1>404 Not Found in SEA app</h1>']);
        }
    } else {
        exists = await verifyFileSystemExists(filePath);
        logger.verbose(`File system file exists: ${exists}`);

        streamPath = exists ? filePath : `${STATIC_PATH}/404.html`;
        ext = path.extname(streamPath).substring(1).toLowerCase();
        stream = fs.createReadStream(streamPath);
    }

    logger.verbose(`File exists (2): ${exists}`);
    logger.verbose(`File found: ${exists && !pathTraversal}`);
    logger.verbose(`Stream path: ${streamPath}`);
    logger.verbose(`File extension: ${ext}`);

    if (ext === 'html') {
        logger.verbose(`Serving html file ${streamPath}`);
        let file;

        if (!isSea) {
            file = await fs.promises.readFile(streamPath, 'utf8');
        } else if (isSea) {
            file = sea.getAsset(streamPath, 'utf8');
        }

        const template = handlebars.compile(file, { noEscape: true });

        // Debug logging of task network, which consists of three properties:
        // 1. nodes: Array of nodes
        // 2. edges: Array of edges
        // 3. tasks: Array of tasks
        logger.debug(`Tasks found: ${taskNetwork?.tasks?.length}`);
        for (const task of taskNetwork.tasks) {
            // Log task type
            if (task.metaNode === false) {
                logger.debug(`Task: [${task.id}] - "${task.taskName}"`);
            } else {
                logger.debug(`Meta node: [${task.id}], Meta node type: ${task.metaNodeType}`);
            }
        }

        // Log nodes
        logger.debug(`Nodes found: ${taskNetwork?.nodes?.length}`);
        for (const node of taskNetwork.nodes) {
            if (node.metaNode === true) {
                logger.debug(`Meta node: [${node.id}] - "${node.label}"`);
            } else {
                logger.debug(`Task node: [${node.id}] - "${node.label}"`);
            }
        }

        // Log edges
        logger.debug(`Edges found: ${taskNetwork?.edges?.length}`);
        for (const edge of taskNetwork.edges) {
            logger.debug(`Edge: ${JSON.stringify(edge)}`);
        }

        // Get task network model
        const taskModel = taskNetwork;

        // Add schema nodes
        const nodes = taskModel.nodes.filter((node) => node.metaNode === true);
        let nodesNetwork = nodes.map((node) => {
            const newNode = {};
            if (node.metaNodeType === 'schedule') {
                newNode.id = node.id;
                newNode.label = node.label;
                newNode.title = `<strong>Schema trigger</strong><br>Name: ${node.label}<br>Enabled: ${
                    node.enabled
                }<br>Schema: ${getSchemaText(
                    node.completeSchemaEvent.incrementOption,
                    node.completeSchemaEvent.incrementDescription
                )}<br>Next: ${
                    node.completeSchemaEvent.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                        ? '-'
                        : node.completeSchemaEvent.operational.nextExecution
                }<br>Timezone: ${node.completeSchemaEvent.timeZone}<br>Triggered times: ${
                    node.completeSchemaEvent.operational.timesTriggered
                }`;
                newNode.shape = 'triangle';
                newNode.color = node.enabled ? '#FFA807' : '#BCB9BF';
                // Needed to distinguish real tasks from meta tasks in the network diagram
                newNode.isReloadTask = false;
                newNode.nodeType = 'scheduleTrigger';
            } else if (node.metaNodeType === 'composite') {
                newNode.id = node.id;
                newNode.label = node.label;
                newNode.title = `<strong>Composite trigger</strong><br>Name: ${node.label}<br>Enabled: ${node.enabled}`;
                newNode.shape = 'hexagon';
                newNode.color = '#FFA807';
                // Needed to distinguish real tasks from meta tasks in the network diagram
                newNode.isReloadTask = false;
                newNode.nodeType = 'compositeTrigger';
            } else {
                logger.error(`Huh? That's an unknown meta node type: ${node.metaNodeType}`);
            }
            return newNode;
        });

        // Add task nodes
        nodesNetwork = taskModel.tasks
            .map((node) => {
                let newNode = null;
                newNode = {};
                newNode.id = node.taskId;
                newNode.label = node.taskName;
                // newNode.title = node.taskName;

                // Reload task or external program task?
                if (node.taskType === 0) {
                    // Reload task
                    newNode.title = `<strong>Reload task</strong><br>Name: ${node.taskName}<br>Task ID: ${node.taskId}<br>Enabled: ${node.taskEnabled}<br>App: ${node.appName}<br>Last exec status: ${node.taskLastStatus}<br>Last exec start: ${node.taskLastExecutionStartTimestamp}<br>Last exec stop: ${node.taskLastExecutionStopTimestamp}`;
                    newNode.shape = 'box';
                    newNode.nodeType = 'reloadTask';
                } else if (node.taskType === 1) {
                    // External program task
                    newNode.title = `<strong>Ext. program task</strong><br>Name: ${node.taskName}<br>Task ID: ${node.taskId}<br>Enabled: ${node.taskEnabled}<br>Last exec status: ${node.taskLastStatus}<br>Last exec start: ${node.taskLastExecutionStartTimestamp}<br>Last exec stop: ${node.taskLastExecutionStopTimestamp}`;
                    newNode.shape = 'ellipse';
                    newNode.nodeType = 'externalProgramTask';
                }

                // Needed to distinguish real tasks from meta tasks in the network diagram
                newNode.isReloadTask = true;

                if (node.taskLastStatus === 'NeverStarted' || node.taskLastStatus === '?') {
                    newNode.color = '#999';
                } else if (node.taskLastStatus === 'Triggered' || node.taskLastStatus === 'Queued') {
                    newNode.color = '#6cf';
                } else if (node.taskLastStatus === 'Started') {
                    newNode.color = '#6cf';
                } else if (
                    node.taskLastStatus === 'AbortInitiated' ||
                    node.taskLastStatus === 'Aborting' ||
                    node.taskLastStatus === 'Error' ||
                    node.taskLastStatus === 'Reset'
                ) {
                    newNode.color = '#fd8008';
                } else if (node.taskLastStatus === 'Aborted' || node.taskLastStatus === 'FinishedFail') {
                    newNode.color = '#fb0207';
                } else if (node.taskLastStatus === 'FinishedSuccess') {
                    newNode.color = '#21ff06';
                } else if (node.taskLastStatus === 'Skipped') {
                    newNode.color = '#ffcc00';
                }
                newNode.taskLastStatus = node.taskLastStatus;
                return newNode;
            })
            .concat(nodesNetwork);

        // Add a text with edge count for the edges where edgeCount > 1
        // No text for edges where edgeCount === 1
        // Update the edge label in taskModel.edges[] with the edge count
        taskModel.edges.map((edge) => {
            if (edge.edgeCount > 1) {
                edge.label = `${edge.edgeCount}`;
            } else {
                edge.label = '';
            }
        });

        const networkTask = { nodes: nodesNetwork, edges: taskModel.edges };

        templateData.nodes = JSON.stringify(nodesNetwork);
        templateData.edges = JSON.stringify(taskModel.edges);

        templateData.visOptions = JSON.stringify(visOptions);

        const result = template(templateData);
        stream = Readable.from([result]);
    } else if (ext === 'js' || ext === 'css' || ext === 'svg') {
        logger.verbose(`Serving js, css or svg file ${streamPath}`);

        let asset;
        if (!isSea) {
            asset = await fs.promises.readFile(streamPath, 'utf8');
        } else if (isSea) {
            asset = sea.getAsset(streamPath, 'utf8');
        }

        stream = Readable.from([asset]);
    } else if (ext === 'png' || ext === 'jpg' || ext === 'gif' || ext === 'ico') {
        logger.verbose(`Serving image file ${streamPath}`);

        let asset;
        if (!isSea) {
            asset = await fs.promises.readFile(streamPath);
        } else if (isSea) {
            asset = sea.getAsset(streamPath);
        }

        if (asset instanceof ArrayBuffer) {
            asset = Buffer.from(asset);

            // Show new type of asset
            if (asset instanceof Uint8Array) {
                logger.verbose('asset is Uint8Array');
            } else if (asset instanceof ArrayBuffer) {
                logger.verbose('asset is ArrayBuffer');
            } else if (asset instanceof Buffer) {
                logger.verbose('asset is Buffer');
            }
        }

        stream = Readable.from([asset]);
    }

    return { found: exists && !pathTraversal, ext, stream };
};

// Request handler for http server
const requestHandler = async (req, res) => {
    const file = await prepareFile(req.url);

    // console.log('File:');
    // console.log(file);

    logger.verbose(`File found: ${file.found}`);
    logger.verbose(`File extension: ${file.ext}`);

    const statusCode = file.found ? 200 : 404;
    const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;

    logger.verbose(`Serving file ${req.url} with status code ${statusCode} and mime type ${mimeType}`);

    res.writeHead(statusCode, { 'Content-Type': mimeType });
    file.stream.pipe(res);

    if (statusCode === 404) {
        logger.error(`${req.method} ${req.url} ${statusCode}`);
    } else if (statusCode === 200) {
        logger.verbose(`${req.method} ${req.url} ${statusCode}`);
    }
};

// Set up http server for serving html pages with the task visualization
const startHttpServer = async (options) => {
    const server = http.createServer(requestHandler);

    server.listen(options.visPort, options.visHost, () => {
        logger.info('Using vis.js to visualize tasks, more info at https://github.com/visjs/vis-network');
        logger.info('');
        logger.info(`Task visualization server listening on http://${options.visHost}:${options.visPort}`);
        logger.info('Press Ctrl-C to quit.');
    });
};

/**
 * Start an HTTP server for visualizing QSEoW tasks as a network diagram.
 *
 * @param {Object} options - Options for the visTask function.
 * @returns {Promise<boolean>} - A promise that resolves to true if the server was started successfully, false otherwise.
 */
export async function visTask(options) {
    // Set log level
    setLoggingLevel(options.logLevel);

    logger.verbose(`Ctrl-Q was started as a stand-alone binary: ${isSea}`);
    logger.verbose(`Ctrl-Q was started from ${execPath}`);

    logger.verbose('Visulise tasks');
    logger.debug(`Options: ${JSON.stringify(options, null, 2)}`);

    logger.verbose(`Path to html files: ${STATIC_PATH}`);

    // List all files in __dirname directory if log level is debug and not SEA app
    if (!isSea) {
        fs.readdir(STATIC_PATH, (err, files) => {
            if (err) {
                return logger.error(`Unable to scan html directory: ${err}`);
            }
            files.forEach((file) => {
                logger.debug(file);
                const stats = fs.statSync(`${STATIC_PATH}/${file}`);
                const fileSizeInBytes = stats.size;
                logger.debug(`File size: ${fileSizeInBytes}`);
                logger.debug('-------------------');
            });

            return true;
        });
    }

    // NOTE: If running as SEA app, it is not possible to list files in the static directory

    // Verify files used by http server exist
    logger.verbose(`Verifying that files used by http server exist`);
    let fileExists;
    if (isSea) {
        fileExists = verifySeaAssetExists(`/index.html`);
    } else {
        fileExists = await verifyFileSystemExists(`${STATIC_PATH}/index.html`);
    }
    if (!fileExists && isSea) {
        logger.error(`File /index.html does not exist`);
        return false;
    } else if (!fileExists && !isSea) {
        logger.error(`File ${STATIC_PATH}/index.html does not exist`);
        return false;
    }

    if (isSea) {
        fileExists = verifySeaAssetExists(`/404.html`);
    } else {
        fileExists = await verifyFileSystemExists(`${STATIC_PATH}/404.html`);
    }
    if (!fileExists && isSea) {
        logger.error(`File /404.html does not exist`);
        return false;
    } else if (!fileExists && !isSea) {
        logger.error(`File ${STATIC_PATH}/404.html does not exist`);
        return false;
    }

    // Get all tasks from QSEoW
    const optionsNew = { ...options };
    optionsNew.getAllTasks = true;

    // Get reload and external program tasks
    const qlikSenseTasks = new QlikSenseTasks();
    await qlikSenseTasks.init(optionsNew);
    const res1 = await qlikSenseTasks.getTaskModelFromQseow();
    if (!res1) {
        logger.error('Failed to get task model from QSEoW');
        return false;
    }

    // Filter tasks based on CLI options. Two possible
    // 1. If no filters specified, show all tasks.
    // 2. At least one filter specified.
    //    - If --task-id <id...> specified
    //      - Get root task(s) for each specified task id
    //      - Include in network diagram all tasks that are children of the root tasks
    //    - If --task-tag <tag...> specified
    //      - Get all tasks that have the specified tag(s)
    //      - Get root task(s) for each task that has the specified tag(s)§
    //    - If --app-id <id...> specified
    //      - Get all tasks that are associated with the specified app id(s)
    //      - Get root task(s) for each task that is associated with the specified app id(s)
    //      - Include in network diagram all tasks that are children of the root tasks
    //    - If --app-tag <tag...> specified
    //      - Get all apps that are associated with the specified app tag(s)
    //      - Get all tasks that are associated with the apps that have the specified app tag(s)
    //      - Get root task(s) for each task that is associated with the apps that have the specified app tag(s)
    //      - Include in network diagram all tasks that are children of the root tasks
    //
    // Filters above are additive, i.e. all tasks that match any of the filters are included in the network diagram.
    // Make sure to de-duplicate root tasks.

    // If no task id or tag filters specified, visualize all nodes in task model
    if (!options.taskId && !options.taskTag) {
        // No task id filters specified
        // Visualize all nodes in task model
        logger.verbose('No task id or tag filters specified. Visualizing all nodes in task model.');

        taskNetwork = qlikSenseTasks.taskNetwork;
    } else {
        // Task id filters specified.
        // Get all task chains the tasks are part of, then get the root nodes of each chain.
        // They will be the starting points for the task tree.

        // Array to keep track of root nodes of task chains
        const rootNodes = await qlikSenseTasks.getRootNodesFromFilter();

        // List root nodes to console
        logger.verbose(`${rootNodes.length} root nodes sent to visualizer:`);
        rootNodes.forEach((node) => {
            // Meta node?
            if (node.metaNode === true) {
                // Reload task?
                if (node.taskType === 'reloadTask') {
                    logger.verbose(
                        `Meta node: metanode type=${node.metaNodeType} id=[${node.id}] task type=${node.taskType} task name="${node.completeSchemaEvent.reloadTask.name}"`
                    );
                }
            } else {
                logger.verbose(`Root node: [${node.id}] "${node.taskName}"`);
            }
        });

        // Get all nodes that are children of the root nodes
        const { nodes, edges, tasks } = await qlikSenseTasks.getNetworkFromRootNodes(rootNodes);

        taskNetwork = { nodes, edges, tasks };
    }

    // Look for circular task chains in the task network
    logger.info('');
    logger.info('Looking for circular task chains in the task network');

    try {
        const result = findCircularTaskChains(taskNetwork, logger);

        // Errros?
        if (result === false) {
            return false;
        }

        const circularTaskChains = result.circularTaskChains;
        const duplicateEdges = result.duplicateEdges;

        // De-duplicate circular task chains (where fromTask.id and toTask.id matches in two different chains).
        const deduplicatedCircularTaskChain = circularTaskChains.filter((chain, index, self) => {
            return self.findIndex((c) => c.fromTask.id === chain.fromTask.id && c.toTask.id === chain.toTask.id) === index;
        });

        // Log circular task chains, if any were found.
        if (deduplicatedCircularTaskChain?.length > 0) {
            logger.warn('');
            logger.warn(`Found ${deduplicatedCircularTaskChain.length} circular task chains in task model`);
            for (const chain of deduplicatedCircularTaskChain) {
                logger.warn(`Circular task chain:`);

                logger.warn(`   From task : [${chain.fromTask.id}] "${chain.fromTask.taskName}"`);
                logger.warn(`   To task   : [${chain.toTask.id}] "${chain.toTask.taskName}"`);
            }
        } else {
            logger.info('No circular task chains found in task model');
        }

        // Log duplicate edges, if any were found.
        // De-duplicate first. If two edges have the same from and to task id, and the same rule state, it's a duplicate.
        const deduplicatedDuplicateEdges = duplicateEdges.filter((edge, index, self) => {
            return (
                self.findIndex(
                    (e) =>
                        e.parentNode.id === edge.parentNode.id &&
                        e.downstreamNode.id === edge.downstreamNode.id &&
                        e.ruleState === edge.ruleState
                ) === index
            );
        });

        if (deduplicatedDuplicateEdges?.length > 0) {
            logger.warn('');
            logger.warn(`Found ${deduplicatedDuplicateEdges.length} duplicate task triggers in task model, across all examined tasks.`);
            for (const duplicate of deduplicatedDuplicateEdges) {
                logger.warn(
                    `Multiple downstream nodes (${duplicate.duplicateEdgeCount}) with the same ID and the same trigger relationship "${duplicate.ruleState}" with the parent node.`
                );
                logger.warn(`   Parent node     : [${duplicate.parentNode.id}] "${duplicate.parentNode.completeTaskObject?.name}"`);
                logger.warn(`   Downstream node : [${duplicate.downstreamNode.id}] "${duplicate.downstreamNode.completeTaskObject?.name}"`);
            }
        }
    } catch (error) {
        catchLog('FIND CIRCULAR TASK CHAINS', error);
        return false;
    }

    // Add additional values to Handlebars template
    templateData.visTaskHost = options.visHost;
    templateData.visTaskPort = options.visPort;

    // Get reload task count, i.e. tasks where taskType === 0
    // templateData.reloadTaskCount = qlikSenseTasks.taskList.filter((task) => task.taskType === 0).length;
    templateData.reloadTaskCount = taskNetwork.tasks.filter((task) => task.taskType === 0).length;

    // Get external program task count, i.e. tasks where taskType === 1
    // templateData.externalProgramTaskCount = qlikSenseTasks.taskList.filter((task) => task.taskType === 1).length;
    templateData.externalProgramTaskCount = taskNetwork.tasks.filter((task) => task.taskType === 1).length;

    // Get schema trigger count
    // Count taskNetwork.nodes events where metaNodeType === 'schedule'
    templateData.schemaTriggerCount = taskNetwork.nodes.filter((node) => node.metaNodeType === 'schedule').length;

    // Get composite trigger count
    // Count taskNetwork.nodes events where metaNodeType === 'composite'
    templateData.compositeTaskCount = taskNetwork.nodes.filter((node) => node.metaNodeType === 'composite').length;

    startHttpServer(optionsNew);
    return true;
}
