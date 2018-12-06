'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import {
  CompositeDisposable,
  BufferedProcess
} from 'atom';

let helpers;
let path;
let fs;
let daemon;

function loadDeps() {
  if (!helpers) {
    helpers = require('atom-linter');
  }
  if (!path) {
    path = require('path');
  }
  if (!fs) {
    fs = require('fs');
  }  
}

export default {
  activate(state) {
    this.idleCallbacks = new Set();
    let depsCallbackID;
    const installLinterDeps = () => {
      this.idleCallbacks.delete(depsCallbackID);
      if (!atom.inSpecMode()) {
        require('atom-package-deps').install('linter-phan');
      }
      loadDeps();
    };
    depsCallbackID = window.requestIdleCallback(installLinterDeps);
    this.idleCallbacks.add(depsCallbackID);

    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(
      atom.config.observe('linter-phan.numProcesses', (value) => {
        this.numProcesses = value;
      }),      
    );
    
    this.startDaemon();
  },

  deactivate() {
    this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
    
    this.stopDaemon();
  },

  getExecutable(client = false) {
    loadDeps();
    
    // Check if a local phan executable is available
    let executable = path.join(this.getWorkDir(), 'vendor/bin/phan');
    
    if (client) {
      executable = `${executable}_client`;
    }
    
    return executable;
  },
  
  getWorkDir() {
    return atom.project.getPaths()[0];
  },

  startDaemon() {
    const command = this.getExecutable();

    if (!fs.existsSync(command)) {
      return;
    }

    const args = [
      '--quick',
      `--processes=${this.numProcesses}`,
      '--daemonize-tcp-port=4846'
    ];    
    
    const options = {
      cwd: this.getWorkDir(),
      ignoreExitCode: true,
      timeout: false,
    };
    
    console.log(`Starting Phan daemon with '${command} ${args.join(' ')}'`);
    daemon = new BufferedProcess({command, args, options});
  },

  stopDaemon() {
    if (daemon) {
      daemon.kill();
    }
  },

  provideLinter() {
    return {
      name: 'Phan',
      grammarScopes: ['text.html.php', 'source.php'],
      scope: 'file',
      lintOnChange: true,
      lint: async (textEditor) => {
        const filePath = textEditor.getPath();
        const fileText = textEditor.getText();

        if (fileText === '' || !filePath) {
          // Empty file, empty results
          return [];
        }

        loadDeps();

        const executable = this.getExecutable(true);

        // Phan cli parameters
        const parameters = [
          '-l',
          filePath
        ];

        // Phan exec options
        const execOptions = {
          cwd: this.getWorkDir(),
          ignoreExitCode: true,
          timeout: 1000 * 60 * 5, // ms * s * m: 5 minutes
        };

        // Execute phan
        const result = await helpers.exec(executable, parameters, execOptions)

        if (result === null) {
          // Our specific spawn was terminated by a newer call, tell Linter not
          // to update messages
          return null;
        }

        // Check if the file contents have changed since the lint was triggered
        if (textEditor.getText() !== fileText) {
          // Contents have changed, tell Linter not to update results
          return null;
        }

        const messages = [];

        const regex = /^Phan error: ([^:]+): ([^:]+): (.*) in (\S*) on line (\d*)/gm;

        let match = regex.exec(result);
        while (match !== null) {
          messages.push({
            type: 'Error',
            filePath: match[4],
            range: [
              [match[5] - 1, 0],
              [match[5] - 1, 0]
            ],
            text: `${match[3]}\n[${match[1]}/${match[2]}]`,
          });

          match = regex.exec(result);
        }

        return messages;
      }
    };
  }
};
