var fs = require('fs');
var spawn = require('child_process').spawn;
var addon = require('./wrapper/build/Release/addon');

var echld = new addon.EchldWrapper(10);
var monitors = [];
var echldIds = [];

console.log('echld is initiated.');
process.on('message', function(m) {
	if (m.type === 'capture') {
		console.log('echld is capturing packets.');
		//instead of using tail cmd, we may also use watchFile function provided in Node.js
		/*fs.watchFile('E:/jsonshark/public/data/packets.txt', function (curr, prev) {
			if (curr.mtime.getTime() !== prev.mtime.getTime()) {
				console.log('changed');
				//socket.emit('serverMessage', 'changed');
				message=new Object();
				message.status="captureSuccess";
				message.id = m.id;
				message.info = "test info: file changed";
				process.send(message);
			}
		});*/
		console.log('m.content.interfaces.toString(): ' + m.content.interfaces.toString());
		console.log('m.id: ' + m.id);
		if (fs.existsSync('./public/tmp/simple.'+m.id)) {
			fs.unlinkSync('./public/tmp/simple.'+m.id);
			console.log('successfully deleted ./public/tmp/simple.'+m.id);
		}
		var pid = echld.capture(m.id.toString(), m.content.interfaces.toString(), m.content.options, m.content.filter);
		if (pid < 0) {
			message = new Object();
			message.status = "captureFailed";
			message.id = m.id;
			proces.send(message);
			return;
		}
		echldIds[m.id] = pid;
		
		//fileName = './public/data/summary-json.tmp'; //Here, we use summary-json.tmp file for the purpose of testing UI
		fileName = './public/tmp/simple.'+m.id; //this is the actual file that contains a list of the summarized packets
		var monitor = spawn('tail', ['-f', fileName]);
		monitor.stdout.on('data', function(data) {
			if (data.length > 0) {
				newData = new String(data);
				newData = newData.substring(0, newData.length-2);
				newData = '[' + newData +']';
				newData = newData.replace(/(\r\n|\n|\r)/gm,"");
				console.log('tail output: ' + newData);
				var packets = JSON.parse(newData);
				for(var i=0; i<packets.length; i++) {
				var message = new Object();
					message.status = 'captureSuccess';
					message.id = m.id;
					message.info = packets[i];
					process.send(message);
				}
			}
		});
		monitor.stderr.on('data', function(data) {
			console.log('tail error output:', data);
		});
		monitors["capture" + m.id] = monitor;
		if (m.content.options > 0) {
			var time = m.content.options * 1000;
			console.log('send stop message to wrapper after time ' + time);
			var timeout = setTimeout(function() {
				console.log('echld is closing by setting timeout: ' + echldIds[m.id]);
				var state = echld.stop(echldIds[m.id]);
				message = new Object();
				message.id = m.id;
				if (state < 0) {
					message.status = "stopCaptureFailed";
				}
				if (monitors["capture" + m.id] != null) {
					monitors["capture" + m.id].kill();
				}
				message.status = 'stopSuccess';
				console.log('echild stopped capturing packets.');
				process.send(message);
			}, time);
		}
	}
	else if (m.type === 'dissect') {
		console.log('begin to call echld.dissect() from JS.');
		
		var state = echld.dissect(m.id.toString(), m.content.packetId);
		newData = new String(state.msg);
		newData = newData.replace("\\","/");
		newData = newData.replace(/[\r\n]/ig, "");
		console.log("data is: " + state.msg);
		var packetInfo = JSON.parse(state.msg);
		packetInfo.packetId = m.content.packetId;
		var message = new Object();
		message.status = "dissectSuccess";
		message.id = m.id;
		message.info = packetInfo;
		console.log('echild send dissected packet:' + m.info);
		process.send(message);
	}
	else if (m.type === 'openFile') {
		console.log('echld is openning files.');
		if (fs.existsSync('./public/tmp/simple.'+m.id)) {
			fs.unlinkSync('./public/tmp/simple.'+m.id);
			console.log('successfully deleted ./public/tmp/simple.'+m.id);
		}
		var pid = echld.openFile(m.id.toString(), m.content.files[0].toString());
		if (pid < 0) {
			message = new Object();
			message.status = "openFileFailed";
			message.id = m.id;
			proces.send(message);
			return;
		}
		echldIds[m.id] = pid;
		
		//fileName = './public/data/summary-json.tmp'; //Here, we use summary-json.tmp file for the purpose of testing UI
		fileName = './public/tmp/simple.'+m.id;  //this is the actual file that contains a list of the summarized packets
		var monitor = spawn('tail', ['-f', fileName]);
		monitor.stdout.on('data', function(data) {
			if (data.length > 0) {
				newData = new String(data);
				newData = newData.substring(0, newData.length-2);
				newData = '[' + newData +']';
				newData = newData.replace(/(\r\n|\n|\r)/gm,"");
				console.log('tail output: ' + newData);
				var packets = JSON.parse(newData);
				for(var i=0; i<packets.length; i++) {
					var message = new Object();
					message.status = "openFileSuccess";
					message.id = m.id;
					message.info = packets[i];
					process.send(message);
				}
			}
		});
		monitor.stderr.on('data', function(data) {
			console.log('tail error output:', data);
		});
		monitors["openFile" + m.id] = monitor;
	}
	else if (m.type === 'saveFile') {
		//Function reserved for echld module
		//echld.saveFile(m.info);
		//var message = new Object();
		//message.status = "saveFileSuccess";
		//message.id = m.id;
		//process.send(message);
	}
	else if (m.type === 'stop') {
		console.log('echld is closing: ' + echldIds[m.id]);
		var state = echld.stop(echldIds[m.id]);
		message = new Object();
		message.id = m.id;
		if (state < 0) {
			message.status = "stopCaptureFailed";
		}

		if (monitors["capture" + m.id] != null) {
			monitors["capture" + m.id].kill();
		}
		/*if (monitors["interface" + m.id] != null) {
			monitors["interface" + m.id].kill();
		}*/
		message.status = 'stopSuccess';
		console.log('echild stopped capturing packets.');
		process.send(message);
	}
	else if (m.type === 'close') {
		var state = echld.closeChild(echldIds[m.id]);
		if (state < 0) {
			message = new Object();
			message.status = "closeChildFailed";
			message.id = m.id;
			proces.send(message);
			return;
		}

		if (monitors["capture" + m.id] != null) {
			monitors["capture" + m.id].kill();
		}
		console.log('echild is closed.');
	}
	else if (m.type === 'interfaceList') {

		console.log('begin to call echld.interfaceList() from JS.');
		var state = echld.interfaceList();
		console.log(state.msg);
		var interfaceInfo = JSON.parse(state.msg);
		var message = new Object();
		message.status = "interfaceListSuccess";
		message.id = m.id;
		message.info = interfaceInfo;
		console.log('echild send interfaces:' + m);
		process.send(message);

		//Here, we use interface-json.tmp file for the purpose of testing UI
		/*fileName = './public/data/interface-json.tmp';
		var monitor = spawn('tail', ['-f', fileName]);
		monitor.stdout.on('data', function(data) {
			console.log('tail output: ' + data);
			var packetInfo = JSON.parse(data);
			var message = new Object();
			message.status = "interfaceListSuccess";
			message.id = m.id;
			message.info = packetInfo;
			console.log('echild send interfaces:' + m);
			process.send(message);
		});
		monitor.stderr.on('data', function(data) {
			console.log('tail error output:', data);
		});
		monitors["interface" + m.id] = monitor;*/
	}
	else if (m.type === 'fileList') {
		console.log('begin to call echld.fileList() from JS.');
		var state = echld.fileList();
		console.log(state.msg);
		var fileInfo = JSON.parse(state.msg);
		var message = new Object();
		message.status = "fileListSuccess";
		message.id = m.id;
		message.info = fileInfo;
		console.log('echild send files:' + m);
		process.send(message);
	}
});

//Function reserved for echld module if necessary
/*function getChildId(id) {
	echldId = echldIds[id];
	if (echldId == null)
		echldId = echld.newChild();
	else
		echldIds[m.id] = echldId;
}*/
