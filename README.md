# node-dbgp

Library that communicates with a Xdebug server

## Example

`iojs --es_staging example.js`

## Events
- started
- stopped
- breakpoint

## Commands
- run
- stepInto
- stepOver
- stepOut
- stop

## Options: default
- port: 9000
- showHidden: true
- maxChildren: 32
- maxData: 1024
- maxDepth: 3
- breakOnStart: false
- includeContextOnBreak: true
- includeSourceOnBreak: false
- sourceOnBreakLines: 2
- includeGlobals: true
