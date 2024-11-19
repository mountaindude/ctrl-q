import { Option } from 'commander';

import { catchLog } from '../util/log.js';
import { qseowSharedParamAssertOptions, variableGetAssertOptions } from '../util/qseow/assert-options.js';
import { getVariable } from '../cmd/qseow/getvariable.js';

export function setpQseowGetVariableCommand(qseow) {
    qseow
        .command('variable-get')
        .description('get variable definitions in one or more apps')
        .action(async (options) => {
            await qseowSharedParamAssertOptions(options);
            variableGetAssertOptions(options);

            getVariable(options);
        })
        .addOption(
            new Option('--log-level <level>', 'log level').choices(['error', 'warn', 'info', 'verbose', 'debug', 'silly']).default('info')
        )
        .requiredOption('--host <host>', 'Qlik Sense server IP/FQDN')
        .option('--engine-port <port>', 'Qlik Sense server engine port (usually 4747 for cert auth, 443 for jwt auth)', '4747')
        .option('--qrs-port <port>', 'Qlik Sense repository service (QRS) port (usually 4747 for cert auth, 443 for jwt auth)', '4242')
        .option('--schema-version <string>', 'Qlik Sense engine schema version', '12.612.0')
        .option('--app-id <id...>', 'Qlik Sense app ID(s) to get variables from')
        .option('--app-tag <tag...>', 'Qlik Sense app tag(s) to get variables')
        .requiredOption('--virtual-proxy <prefix>', 'Qlik Sense virtual proxy prefix', '')
        .requiredOption(
            '--secure <true|false>',
            'https connection to Qlik Sense must use correct certificate. Invalid certificates will result in rejected/failed connection.',
            true
        )
        .requiredOption('--auth-user-dir <directory>', 'user directory for user to connect with')
        .requiredOption('--auth-user-id <userid>', 'user ID for user to connect with')

        .addOption(new Option('-a, --auth-type <type>', 'authentication type').choices(['cert', 'jwt']).default('cert'))
        .option('--auth-cert-file <file>', 'Qlik Sense certificate file (exported from QMC)', './cert/client.pem')
        .option('--auth-cert-key-file <file>', 'Qlik Sense certificate key file (exported from QMC)', './cert/client_key.pem')
        .option('--auth-root-cert-file <file>', 'Qlik Sense root certificate file (exported from QMC)', './cert/root.pem')
        .option('--auth-jwt <jwt>', 'JSON Web Token (JWT) to use for authentication with Qlik Sense server')

        .addOption(
            new Option('--id-type <type>', 'type of identifier passed in the --variable option').choices(['id', 'name']).default('name')
        )
        .option('--variable <ids...>', 'variables to retrieve. If not specified all variables will be retrieved')
        .addOption(new Option('--output-format <format>', 'output format').choices(['json', 'table']).default('json'));
}
