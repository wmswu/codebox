var es = require('event-stream');
var io = require('socket.io-client');
var ss = require('socket.io-stream');
var fs = require('fs');

// Setup
var socket = io.connect('http://localhost:8082/stream/shells');
var stream = ss.createStream();

var log = fs.createWriteStream('output.txt');

// Shell args
var args = {
    shellId: process.argv[2],
    opts: {
        rows: process.stdout.rows,
        columns: process.stdout.columns
        /* 
         * Other options
        uid: 501,
        gid: 20,
        id: "something",  // same as shellId
        cwd: "/app/"  // Folder to open shell in
        // ENV variables
        env: {
            HOME: "/home/something",
            DEV: "true"
        }
        */
    }
};

// Send stream to server
ss(socket).emit('shell.open', stream, args);

var state = { meta: false };
var keyboard = es.through(function (buf) {
    if (buf.length === 1 && buf[0] === 1) {return state.meta = true};

    if (state.meta && buf[0] === 'd'.charCodeAt(0)) {
        process.exit();
    }
    else this.queue(buf);
    state.meta = false;
});

// Piping
keyboard.pipe(stream).pipe(process.stdout);
stream.pipe(log);

process.stdin.setRawMode(true);
process.stdin.pipe(keyboard);

process.on('exit', function () {
    process.stdin.setRawMode(false);
    console.log('\n[shux exited]');
});
stream.on('end', function() {
    process.exit();
});