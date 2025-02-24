import axios from 'axios';

import { logger } from '../../../globals.js';
import { setupQrsConnection } from './qrs.js';
import { catchLog } from '../log.js';

// Function to get stream(s) from QRS, given a stream name
// Parameters:
// - streamName: Name of stream to get
// - options: Command line options
//
// Returns:
// - Array of zero or more stream objects.
// - false if error
export async function getStreamByName(streamName, options) {
    try {
        logger.debug(`GET STREAM BY NAME: Starting get stream by name from QSEoW for stream name ${streamName}`);

        // Did we get a stream name?
        if (!streamName) {
            logger.error(`GET STREAM BY NAME: No stream name provided.`);
            return false;
        }

        // Set up connection to QRS
        const axiosConfig = setupQrsConnection(options, {
            method: 'get',
            path: `/qrs/stream/full`,
            queryParameters: [{ name: 'filter', value: `name eq '${streamName}'` }],
        });

        const result = await axios.request(axiosConfig);
        logger.debug(`GET STREAM BY NAME: Result=${result.status}`);

        if (result.status === 200) {
            const streamArray = JSON.parse(result.data);
            logger.debug(`GET STREAM BY NAME: Stream details: ${streamArray}`);
            logger.verbose(`Found ${streamArray.length} streams with name ${streamName}`);

            return streamArray;
        }

        return false;
    } catch (err) {
        catchLog('GET STREAM BY NAME', err);
        return false;
    }
}

// Function to get stream(s) from QRS, given a stream ID
// Parameters:
// - streamId: ID of stream to get
// - options: Command line options
//
// Returns:
// - Array of zero or more stream objects.
// - false if error
export async function getStreamById(streamId, options) {
    try {
        logger.debug(`GET STREAM BY ID: Starting get stream by ID from QSEoW for stream ${streamId}`);

        // Did we get a stream ID?
        if (!streamId) {
            logger.error(`GET STREAM BY ID: No stream ID provided.`);
            return false;
        }

        // Set up connection to QRS
        const axiosConfig = setupQrsConnection(options, {
            method: 'get',
            path: `/qrs/stream/full`,
            queryParameters: [{ name: 'filter', value: `id eq ${streamId}` }],
        });

        const result = await axios.request(axiosConfig);
        logger.debug(`GET STREAM BY ID: Result=${result.status}`);

        if (result.status === 200) {
            const streamArray = JSON.parse(result.data);
            logger.debug(`GET STREAM BY ID: Stream details: ${streamArray}`);
            logger.verbose(`Found ${streamArray.length} streams with ID ${streamId}`);

            return streamArray;
        }

        return false;
    } catch (err) {
        catchLog('GET STREAM BY ID', err);
        return false;
    }
}
