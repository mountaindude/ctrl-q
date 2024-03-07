import axios from 'axios';
import path from 'path';
import { logger, execPath } from '../../globals.js';
import setupQRSConnection from './qrs.js';
import { catchLog } from './log.js';

const getProxiesFromQseow = async (options, sessionCookie) => {
    logger.verbose(`Getting all proxies from QSEoW...`);

    // Make sure certificates exist
    const fileCert = path.resolve(execPath, options.authCertFile);
    const fileCertKey = path.resolve(execPath, options.authCertKeyFile);

    const axiosConfig = setupQRSConnection(options, {
        method: 'get',
        fileCert,
        fileCertKey,
        path: '/qrs/proxyservice/full',
        sessionCookie: null,
    });

    // Get proxies from QRS
    let proxies = [];
    try {
        const result = await axios.request(axiosConfig);

        if (result.status === 200) {
            const response = JSON.parse(result.data);
            proxies = response;
            logger.info(`Successfully retrieved ${response.length} proxies from host ${options.host}`);
        }
    } catch (err) {
        catchLog('GET VIRTUAL PROXIES FROM QSEoW', err);
        return false;
    }

    return proxies;
};

export default getProxiesFromQseow;
