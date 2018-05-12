#!/usr/bin/env node
import * as vm from "vm";
import { spawn, ChildProcess } from "child_process";
import { Readable, Writable } from "stream";
import * as fs from "fs";
import * as glob from "glob";

namespace jsh {
  const order = [];
  type ReadCom = Command | Readable;
  type ComFunc = { (...args: string[]): Command; com?: string };

  export class Command {
    constructor(com: string, args: string[], piping?: ReadCom) {
      this.com = com;
      this.args = args;

      if (piping) {
        this.execute();
        this.pipeFrom(piping);
      }
    }
    public execute() {
      const proc = (this.proc = spawn(this.com, this.args, {
        cwd: process.cwd(),
        env: { CWD: process.cwd(), ...this.env }
      }));
      proc.on("close", () => {});
    }
    public "|"(com: ComFunc): ComFunc {
      return (...args: string[]) => {
        const command = new Command(com.com, args, this);
        this.pipeTo(command);
        return command;
      };
    }
    public get p() {
      return this["|"];
    }
    public ">"(file) {
      this.pipeTo(fs.createWriteStream(file, "utf8"));
    }
    private pt: Writable;
    public pipeTo(com: Command | Writable) {
      if (com instanceof Command) com = com.proc.stdin;
      this.pt = com;
      this.proc.stdout.pipe(com);
    }
    private pf: Readable;
    public pipeFrom(com: ReadCom) {
      if (com instanceof Command) com = com.proc.stdout;
      this.pf = com;
      com.pipe(this.proc.stdin);
    }
    protected com: string;
    protected args: string[];
    protected env: Object;
    protected proc: ChildProcess;
  }

  const proxObj = {
    setenv() {},
    console
  };

  export const global = new Proxy(proxObj, {
    get: (obj, prop): ComFunc | any =>
      prop in obj
        ? obj[prop]
        : Object.assign(
            (...args: string[]) => new Command(String(prop), args),
            { com: prop }
          ),
    set: () => false
  });
}

vm.runInNewContext(
  `
npm("root").p(cat)().p(rev)()
let f = 9
echo(f)
`,
  jsh.global
);
