const { SerialPort } = require('serialport');

const CMD_HEX = '@HEX';
const CMD_CLR = '@CLR';
const CMD_ANI = '@ANI';
const CMD_7SG = '@7SG';
const CMD_SGR = '@SGR';
const CMD_BRI = '@BRI';
const CMD_BRR = '@BRR';

const RES_RX_DATA = 'rxData:';
const RES_PUSH = 'push';
const RES_7SG = '7SG';
const RES_BRIGHTNESS = 'brightness:';
const RES_ETC = 'etc';
const RES_E0 = 'E0';
const RES_E3 = 'E3';
const RES_E4 = 'E4';

module.exports = function (RED) {
    function nanapo (config) {
        RED.nodes.createNode(this, config)
        const node = this;
        let res = new Uint8Array(60);
        let reslen = 0;

        const port = new SerialPort({
            path: config.port,
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            autoOpen: true
        }, function(err, results) {
          if (err) {
            errorInfo = `Error on write: ${err.message}`;
            node.error(errorInfo);
          } else {
            node.log('Serial port is opened.');
          }
        });
        port.on('data', function(data) {
          res.set(data, reslen);
          reslen += data.length;
          var result = 0;

          while(reslen > 0 && (result = res.indexOf(10)) > 0) {
            var _res = res.slice(0, result-1);
            const msg = {};
            msg.payload = {};
            var res_cmd = new TextDecoder().decode(_res);
            if(res_cmd.startsWith(RES_RX_DATA)){
              msg.payload.cmd = RES_RX_DATA;
              msg.payload.data = res_cmd.slice(RES_RX_DATA.length);
            } else if(res_cmd.startsWith(RES_PUSH)){
              msg.payload.cmd = RES_PUSH;
              msg.payload.data = res_cmd.slice(RES_PUSH.length);
            } else if(res_cmd.startsWith(RES_7SG)){
              msg.payload.cmd = RES_7SG;
              msg.payload.data = res_cmd.slice(RES_7SG.length);
            } else if(res_cmd.startsWith(RES_BRIGHTNESS)){
              msg.payload.cmd = RES_BRIGHTNESS;
              msg.payload.data = res_cmd.slice(RES_BRIGHTNESS.length);
            } else if(res_cmd.startsWith(RES_E0)||res_cmd.startsWith(RES_E3)||res_cmd.startsWith(RES_E4)){
              msg.payload.cmd = 'error';
              msg.payload.data = res_cmd;
            } else {
              msg.payload.cmd = RES_ETC;
              msg.payload.data = res_cmd;
            }
            node.send(msg);

            _res = res.slice(result+1, reslen);
            res.fill(0);
            res.set(_res);
            reslen = _res.length;
          }
        });
        port.on('error', function(err) {
          errorInfo = `serial port error: ${err}`;
          node.error(errorInfo);
        });
        // inputイベント
        node.on('input', function (msg) {
            writePort(node,port,msg.payload+'\n');
        })
  
      // クローズイベント
      node.on('close', function (removed, done) {
        if (port.isOpen) {
          port.close(function(err) {
              if (err) {
                  errorInfo = `Error on write: ${err.message}`;
                  node.error(errorInfo);
              }
              done();
          });
          node.log('Port Closed');
        }
        done();
      })
    }

    let writePort = (node, port, request) => {
      port.write(request, function(err) {
          if (err) {
              errorInfo = `Error on write(event): ${err.message}`;
              node.error(errorInfo);
              return false;
          }
      });
      return true;
    }
  
    RED.nodes.registerType('nanapo', nanapo)
  }
  