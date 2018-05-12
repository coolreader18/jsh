#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm = require("vm");
const child_process_1 = require("child_process");
const fs = require("fs");
var jsh;
(function (jsh) {
    const order = [];
    class Command {
        constructor(com, ...args) {
            this.com = com;
            this.args = args;
            setImmediate(() => {
                if (!this.pt)
                    this.pipeTo(process.stdout);
            });
        }
        execute() {
            const proc = (this.proc = child_process_1.spawn(this.com, this.args, {
                cwd: process.cwd(),
                env: Object.assign({ CWD: process.cwd() }, this.env)
            }));
            proc.on("close", () => { });
        }
        "|"(com) {
            return (...args) => {
                const command = com(...args);
                this.pipeTo(command);
                return command;
            };
        }
        get p() {
            return this["|"];
        }
        ">"(file) {
            this.pipeTo(fs.createWriteStream(file, "utf8"));
        }
        pipeTo(com) {
            if (com instanceof Command)
                com = com.proc.stdin;
            this.pt = com;
            this.proc.stdout.pipe(com);
        }
        pipeFrom(com) {
            if (com instanceof Command)
                com = com.proc.stdout;
            this.pf = com;
            com.pipe(this.proc.stdin);
        }
    }
    jsh.Command = Command;
    const proxObj = {
        setenv() { },
        console
    };
    jsh.global = new Proxy(proxObj, {
        get: (obj, prop, val) => {
            if (prop in obj) {
                return obj[prop];
            }
            else {
                return (...args) => {
                    return new jsh.Command(String(prop), ...args);
                };
            }
        },
        set: () => false
    });
})(jsh || (jsh = {}));
vm.runInNewContext(`
npm("root").p(cat)().p(rev)()
let f = 9
echo(f)
`, jsh.global);
