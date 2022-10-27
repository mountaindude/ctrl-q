const path = require('path');

const { logger, execPath } = require('../../globals');

const getCertFilePaths = async (options) => {
    let fileCert;
    let fileCertKey;
    try {
        // Make sure QRS certificates exist
        fileCert = path.resolve(execPath, options.authCertFile);
        fileCertKey = path.resolve(execPath, options.authCertKeyFile);
    } catch (err) {
        logger.error(`GET TASK QRS (ID): ${err.stack}. Exiting.`);
        process.exit(1);
    }
    return { fileCert, fileCertKey };
};

module.exports = {
    getCertFilePaths,
};
