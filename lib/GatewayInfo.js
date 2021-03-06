'use strict';
var storage = require('node-persist');
var util = require('util');

module.exports = GatewayInfo;

function GatewayInfo (usr) {
	this.username = usr;
	this.model = "";
	this.ip = "";
	this.acc = "";
	this.pwd = "";
	this.mac = "";
}

GatewayInfo.persistKey = function(usr) {
    return util.format("GatewayInfo.%s.json", usr.replace(/:/g,"").toUpperCase());
};

GatewayInfo.create = function(usr) {
    return new GatewayInfo(usr);
}

GatewayInfo.load = function(usr) {
    var key = GatewayInfo.persistKey(usr);
    var saved = storage.getItem(key);

    if (saved) {
        var info = new GatewayInfo(usr);
        info.mac = saved.mac || "";
        info.model = saved.model || "";
		info.ip = saved.ip || "";
        info.acc = saved.acc || "";
        info.pwd = saved.pwd || "";


        return info;
    } else {
        return null;
    }
};

GatewayInfo.prototype.save = function () {
    var content = {
        username: this.username,
        model: this.model,
        ip: this.ip,
        acc: this.acc,
        pwd: this.pwd,
	    mac: this.mac
    }
    var key = GatewayInfo.persistKey(this.username);
    storage.setItemSync(key, content);
    storage.persistSync();
};

GatewayInfo.prototype.remove = function () {
    var key = GatewayInfo.persistKey(this.username);

    storage.removeItemSync(key);
};
