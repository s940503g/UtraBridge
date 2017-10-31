const ct = require('color-temperature');
const debug = require('debug')('Operater');
const auto_update_debug = require('debug')('AutoUpdate');
const hap_nodejs = require('hap-nodejs');
const Accessory = hap_nodejs.Accessory;
const Service = hap_nodejs.Service;
const Characteristic = hap_nodejs.Characteristic;
const uuid = hap_nodejs.uuid;
const child_process = require('child_process');
const parser = require('xml2json').toJson;
const events = require('events');
const GatewayInfo = require('./GatewayInfo.js')
const GatewayManager = require('./GatewayManager.js');
const jsonQuery = require('json-query');

const EXEC_OPTIONS = {timeout: 7 * 1000, killSignal: "SIGKILL"};

module.exports = DeviceTemplate;

function DeviceTemplate (gateway, node) {
    this.gateway = gateway;
    this.node = node.id;
    this.name = node.name || node.product;

    this.accessory = new Accessory(this.name, uuid.generate(this.node.product + this.node.id + this.gateway.mac));
    this.updaters = [];

    this.emitter = new events.EventEmitter();
    this.cache = '';

    let pollRequestListener = () => {
        this.gateway.getNodeValues(this.node.id, (err, result) => {
            this.cache = result; // if cache exists, emitter 'poll-request' has no response.
            this.emitter.emit('poll-response', result);
        });

        setTimeout(() => { // keep cache for 10 sec.
            this.cache = '';
            this.emitter.once('poll-request', pollRequestListener);
        }, 10 * 1000);
    }

    this.emitter.once('poll-request', pollRequestListener);

    return this.accessory;
}

DeviceTemplate.prototype.getValues = function (callback) {
    if (this.cache) {
        callback(null, this.cache);
    } else {
        this.emitter.emit('poll-request');
        this.emitter.once('poll-response', (err, result)=>{ // wait for response;
            callback(err, result);
        });
    }

};

DeviceTemplate.prototype.setValues = function (nodeId, value, state, callback) {
    this.curl = 'curl --digest ' + '-u ' + this.setting.acc + ':' + this.setting.pwd + ' ' + this.setting.ip + ':5000/';
    let cmd = this.curl + 'valuepost.html -d "' +
    nodeId + '-'+ value.class.replace(/\s/,'+') + '-' + value.genre + '-' + value.type + '-' + value.instance + '-' + value.index + '=' + state + '"';
};

DeviceTemplate.prototype.WallSwitch = function () {
    let instances = new Set(jsonQuery(`instance`, {data: this.node.value}).value);

    let setter = (state, callback) => {

    }

    for (let instance of instances) {
        let name = this.name + " " + instance;
        let service = this.accessory.getService(name, instance);
        service = service || this.accessory.addService(Service.Switch, name, instance);

        service.getCharacteristic(Characteristic.On).on('get', (callback)=>{
            getter((err, result) => {
                result = jsonQuery(`[*instance=${instance}]`).value;
                result = result === 'True'
                callback(err, result);
            });
        });
        service.getCharacteristic(Characteristic.On).on('get', (callback) => {
            this.getValues((err, values) => {
                let result = jsonQuery(`[*instance=${instance}][*index=0][*label=Switch]`, {data:values}).value;
                result = result[0] == 'True';
                callback(err, result);
            });
        });
        service.getCharacteristic(Characteristic.On).on('set', setter);
    }

    let updater = setInterval(() => {
        getter((err, values) => {

        });
    }, 10 * 1000);

    this.updaters(updater);
};

DeviceTemplate.prototype.stopUpdate = function () {
    this.updaters.forEach((updater)=>{
        clearInterval(updater);
    });
};


/*
 */

Gateway.prototype.getNodeValues = function (nodeId, callback) {
     this.curl = 'curl --digest ' + '-u ' + this.setting.acc + ':' + this.setting.pwd + ' ' + this.setting.ip + ':5000/';
     let cmd = this.curl + 'node_detail.cgi -d "fun=load&id=' + nodeId + '"';

     child_process.exec(cmd, (err, stdout) => {
         let values;
         let err;
         try {
             if (err) throw err;
             try {
                 values = parser(stdout, {object: true}).node_detail.node.value;
             } catch (e) {
                 this.emitter.emit('error', e);
             }
         } catch (e) {
             err = e;
         } finally {
             callback(err, values);
         }
     });
 };