var _ = require("underscore");
var express = require("express");
var socketio = require("socket.io");
var mongoose = require("mongoose");

var expressServer = express.createServer()
expressServer.use(express.bodyParser());
expressServer.use(express.errorHandler());
expressServer.use(express.static(__dirname + "/public"));

var io = socketio.listen(expressServer, {
	"log level": 2
});

var mongo = mongoose.createConnection('mongodb://whiteboard:wh1teboard@flame.mongohq.com:27100/shared-whiteboard');

var port = parseInt(process.env.PORT, 10) || 1337;
expressServer.listen(port);
console.info("listen port ", port);

var WhiteBoardElement = mongo.model('WhiteBoardElement', new mongoose.Schema({
	whiteboard: String,
	type: String
}));


io.sockets.on("connection", function (socket) {
  	socket.on("connect", function(data) {
  		WhiteBoardElement.find({
  			whiteboard: data.whiteboard
  		}, function(err, docs) {
  			if(!err) {
  				socket.emit("init", docs);
				console.log("connect message, whiteboard", data.whiteboard, "return", docs.length, "docs");
			} else {
				console.error("connect message, error from mongodb", err);
			}
  		});
  	});
  	socket.on("element", function(data) {
		socket.broadcast.emit("element", data);
		
		if(data._id) {
			console.log("element message, receiving update for", data.type, "element for", data.whiteboard, "whiteboard");
			WhiteBoardElement.findOne({
				_id: data._id
			}, function(err, doc) {
				if(err) {
					console.error("error on updating element in mongodb", err);
				}
				_.extend(doc, data);
				doc.save();
			});
		} else {
			console.log("element message, receiving new", data.type, "element for", data.whiteboard, "whiteboard");
			var instance = new WhiteBoardElement(data, false);
			instance.save(function(err) {
				if(err) {
					console.error("error on adding the new element in mongodb", err);
				}
			});
		}
	});
});