# ctrl-q-cli

A cross platform, command line tool for interacting with Qlik Sense Enterprise on Windows.

The tool is designed to be easily extensible if/when additional features are needed.  
In other words: If some feature available in the QSEoW APIs, it can most likely be added to ctrl-q-api without too much effort.

## Install

Ctrl-Q CLI is built using [Node.js](https://nodejs.org/en/).  
The most recent LTS version should work.

Clone the repository then run `npm install` to download all dependencies.

## Logging

Logging is controlled by the --loglevel option.

Valid values are (in order of increasing verbosity): error, warning, info, verbose, debug, silly.

When using log level silly all websocket communication to/from the Sense server will be logged to the console.

## Commands

List available commands using the --help option:

```bash
➜  src node ctrl-q-cli.js --help
Usage: ctrl-q-cli [options] [command]

This is a command line utility for interacting with Qlik Sense Enterprise on Windows servers.
Among other things the tool manipulates master items and scrambles in-app data.

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  importexcel [options]    create master items based on definitions in an Excel file
  getmeasure [options]     get info about one or more master measures
  deletemeasure [options]  delete master measure(s)
  getdim [options]         get info about one or more master dimensions
  deletedim [options]      delete master dimension(s)
  scramblefield [options]  scramble one or more fields in an app. A new app with the scrambled data is created.
  getscript [options]      get script from Qlik Sense app
  help [command]           display help for command
➜  src
```

## Testing

### Measures

List measures

```bash
node ctrl-q-cli.js getmeasure --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --outputformat table --userdir LAB --userid goran --loglevel verbose

2021-07-06T09:34:46.707Z : Get master measure(s)
2021-07-06T09:34:46.822Z : Created session to server 192.168.100.109, engine version is 12.878.3.
2021-07-06T09:34:47.154Z : Opened app a3e0f5d2-000a-464f-998d-33d333b175d7.
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                                                                                                                 Measures (4 measures found in the app)                                                                                                                                                                                                                  │
├──────────────────────────────────────┬─────────┬─────────────────────────────┬──────────────────────────────────────────┬─────────────────────────────┬──────────────────────────────────────┬──────────────────────────────┬─────────────────────────────────────────────┬───────────────────────────────────────┬──────────┬──────────┬───────────┬──────────────────────────┬──────────────────────────┬──────────────────────────┬───────────┬──────────────────────┤
│ Id                                   │ Type    │ Title                       │ Description                              │ Label                       │ Label expression                     │ Definition                   │ Coloring                                    │ Number format                         │ Grouping │ Approved │ Published │ Publish time             │ Created date             │ Modified date            │ Owner     │ Tags                 │
├──────────────────────────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────────────┼──────────┼──────────┼───────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼───────────┼──────────────────────┤
│ LKYyWDm                              │ measure │ Master measure 1            │ Description for master measure 1         │ Master measure 1            │ 'Label expr for master measure 1'    │ sum(Expression1)             │ {"baseColor":{"color":"#99cfcd","index":2}} │ {"qType":"U","qnDec":10,"qUseThou":0} │ N        │ false    │ false     │ 1753-01-01T00:00:00.000Z │ 2021-06-08T11:18:47.216Z │ 2021-06-08T11:18:47.216Z │ LAB\goran │ My awesome tag,Tag 2 │
├──────────────────────────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────────────┼──────────┼──────────┼───────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼───────────┼──────────────────────┤
│ tXgP                                 │ measure │ Master measure 2            │ 'Description for master measure 2'       │ Master measure 2            │ 'Label expr for master measure 2'    │ Avg(Expression2)             │ {"baseColor":{"color":"#a16090","index":9}} │ {"qType":"U","qnDec":10,"qUseThou":0} │ N        │ false    │ false     │ 1753-01-01T00:00:00.000Z │ 2021-06-08T11:53:15.543Z │ 2021-06-08T11:53:15.543Z │ LAB\goran │ Tag 1,Tag 2,Tag 3    │
├──────────────────────────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────────────┼──────────┼──────────┼───────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼───────────┼──────────────────────┤
│ 2a9a2f47-feb2-4846-88be-f5060e942b44 │ measure │ TransactionSalesAmountIndex │ This index shows : Statistical sales sel │ TransactionSalesAmountIndex │ 'Sales value index comparing period' │ =TransactionSalesAmountIndex │ undefined                                   │ {"qType":"U","qnDec":10,"qUseThou":0} │ N        │ false    │ false     │ 1753-01-01T00:00:00.000Z │ 2021-06-09T14:16:45.771Z │ 2021-06-09T14:16:45.771Z │ LAB\goran │ Sales                │
│                                      │         │                             │ ected period / divided by the statiscal  │                             │                                      │                              │                                             │                                       │          │          │           │                          │                          │                          │           │                      │
│                                      │         │                             │ sales of the comparing period.           │                             │                                      │                              │                                             │                                       │          │          │           │                          │                          │                          │           │                      │
├──────────────────────────────────────┼─────────┼─────────────────────────────┼──────────────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────┼──────────────────────────────┼─────────────────────────────────────────────┼───────────────────────────────────────┼──────────┼──────────┼───────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┼───────────┼──────────────────────┤
│ f83df8cb-745b-4a70-bd04-b0d0d58d0edc │ measure │ SoldKitchenQuantity         │ The sum of sales quantity from transacti │ SoldKitchenQuantity         │ 'Sold kitchen quantity'              │ =SoldKitchenQuantity         │ undefined                                   │ {"qType":"U","qnDec":10,"qUseThou":0} │ N        │ false    │ false     │ 1753-01-01T00:00:00.000Z │ 2021-06-09T14:16:45.771Z │ 2021-06-09T14:16:45.771Z │ LAB\goran │ Sales,Kitchen        │
│                                      │         │                             │ on sales entries with item flagged as de │                             │                                      │                              │                                             │                                       │          │          │           │                          │                          │                          │           │                      │
│                                      │         │                             │ fined as kitchen item, minus 10% divided │                             │                                      │                              │                                             │                                       │          │          │           │                          │                          │                          │           │                      │
│                                      │         │                             │ by 10 to obtain one sold kitchen.        │                             │                                      │                              │                                             │                                       │          │          │           │                          │                          │                          │           │                      │
└──────────────────────────────────────┴─────────┴─────────────────────────────┴──────────────────────────────────────────┴─────────────────────────────┴──────────────────────────────────────┴──────────────────────────────┴─────────────────────────────────────────────┴───────────────────────────────────────┴──────────┴──────────┴───────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┴───────────┴──────────────────────┘

2021-07-06T09:34:47.256Z [36mverbose[39m: Closed session after managing master items in app a3e0f5d2-000a-464f-998d-33d333b175d7 on host 192.168.100.109


```




Delete measures

```bash
node ctrl-q-cli.js deletemeasure --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --userdir LAB --userid goran --itemid "8ad641cd-73bc-4605-8bef-529cd2e507d1, af0d7c76-22f6-435a-be68-434a6b158bd1" --loglevel verbose
```

### Dimensions

List dimensions

```bash
node ctrl-q-cli.js getdim --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --outputformat table --userdir LAB --userid goran --loglevel verbose
```

Delete dimensions

```bash
node ctrl-q-cli.js deletedim --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --userdir LAB --userid goran --itemid "b7d9a7f1-8361-4300-ad68-af5ae38cdb8d, a6ed0a7f-0065-4c21-b0ac-1b1250e0d71d" --loglevel verbose
```

### Import

Import dimensions and measures from Excel file

```bash
node ctrl-q-cli.js importexcel --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --userdir LAB --userid goran --file "/Users/goran/code/ctrl-q-cli/test/variables.xlsx" --sheet Sales --columnflag 0 --columnname 5 --columndescr 10 --columnlabel 6 --columnexpr 1 --columntag 7 --loglevel verbose
```

### Scramble

Scrambles one or more fields in an app using Qlik Sense's internal scrambling feature.  

Note:  

- If more than one field is to be scrambled, the indidivudal field names should be separated by the character or string specified in the `--separator` option. 
- The entire list of field names (the `--fieldname` option) should be surrounded by double quotes.
- A new app with the scrambled data will be created. Specify its name in the `--newappname` option.

```bash
node ctrl-q-cli.js scramblefield --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --userdir LAB --userid goran --fieldname Expression1,Dim1,AsciiAlpha --separator , --newappname __ScrambledTest1 --loglevel silly
```

### Get script

Get script and associated metadata for a Sense app

```bash
node ctrl-q-cli.js getscript --host 192.168.100.109 --appid a3e0f5d2-000a-464f-998d-33d333b175d7 --userdir LAB --userid goran --loglevel verbose
```
