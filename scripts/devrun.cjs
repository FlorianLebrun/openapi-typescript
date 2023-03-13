#!/usr/bin/env node

const { script } = require('@polycuber/script.cli');
const nodeWatch = require("node-watch");
const process = require('process');
const child_process = require('child_process');

script((argv) => {
  var current = null;
  var currentRestart_timer = undefined;

  function start(withBreak) {
    let nodeargs = []
    if (argv["inspect"]) {
      if (withBreak || argv["break"]) withBreak = true
      nodeargs.push(`--inspect${withBreak ? "-brk" : ""}=${argv["inspect"]}`)
    }
    else withBreak = false
    console.log(`\x1b[32m[monitor] Start process${withBreak ? " (in break mode)" : ""}\x1b[0m`)
    current = child_process.spawn(
      "node",
      [
        "--require=" + require.resolve("source-map-support/register"),
        "--enable-source-maps",
        ...nodeargs,
        argv.program,
        ...(argv.args || [])
      ],
      {
        stdio: [process.stdin, process.stdout, process.stderr],
      }
    );
    current.on("exit", (code) => {
      current = null
      if (currentRestart_timer !== undefined) {
        console.log(`\x1b[32m[monitor] Restart after 'change'\x1b[0m`)
        currentRestart_timer = undefined;
        start()
      }
      else {
        console.log(`\x1b[${code < 0 ? "31m" : "33m"}[monitor] Process 'exit' (Press Enter or Backspace(breakmode) to restart)\x1b[0m`)
      }
    })
  }

  function restart() {
    if (current !== null && currentRestart_timer === undefined) {
      const timer = setTimeout(() => {
        if (currentRestart_timer === timer) {
          console.log(`\x1b[32m[monitor] Kill process, after 'change'\x1b[0m`)
          current.kill();
        }
      }, 100);
      currentRestart_timer = timer
    }
  }

  function onKeyPress(key) {
    if (key == '\u000d') { // Enter
      if (!current) start(false)
    }
    else if (key == '\u0008') { // Backspace
      if (!current) start(true)
    }
    else if (key == '\u0003') { // ctrl-c
      process.exit()
    }
  }

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', onKeyPress)

  nodeWatch(argv.watch, { recursive: true }).on('change', (change, path) => {
    restart();
  })
  start();

}, {
  "watch": {
    type: "string",
    required: true,
  },
  "program": {
    type: "string",
    required: true,
  },
  "inspect": {
    type: "number",
  },
  "break": {
    type: "boolean",
  },
  "args": {
    type: "string",
    isArray: true,
    closure: true
  }
})
