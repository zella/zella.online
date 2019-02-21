const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const WebSocket = require('ws');
const mustacheExpress = require('mustache-express');

const PORT = parseInt(process.env.PORT) || 3000;
const PROCAAS_WS_URL = process.env.PROCAAS_URL;
const PTY_PROXY_CMD = JSON.parse(process.env.PTY_PROXY_CMD || '[]')

app.use('/', express.static(__dirname));

app.engine('html', mustacheExpress());

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.get('/run/*', function (req, res) {
    path = req.path.replace('/run/','');
    console.log(path);
    res.render('myxterm', { 
        image: path
    });
});

expressWs.app.ws('/docker', function (ws, req) {
    const image = req.query.image;
    const cols = req.query.cols;
    const rows = req.query.rows;

    console.log(image);

    //parameters to process( https://github.com/zella/procaas )
    const processCmd = PTY_PROXY_CMD;
    const processEnvs = {
        'COLS': cols,
        'ROWS': rows,
        'SHELL': 'docker',
        //env must be a string
        //mem, cpu don't care, i think app will have only one user - me :)
        'CMD': JSON.stringify(['run', '-it', '--rm', image])
    };
    const dataParam = encodeURIComponent(JSON.stringify({'cmd': processCmd, 'envs': processEnvs}));

    const client = new WebSocket(PROCAAS_WS_URL + '?data=' + dataParam);

    client.on('message', function incoming(data) {
        ws.send(data);
    });

    ws.on('message', function (data) {
        client.send(data)
    });
});

app.listen(PORT);