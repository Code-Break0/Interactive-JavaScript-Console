var _editor, _statusbar, _console, _history = [""], _historyIndex = 0, _consoleEditor;

window.addEventListener("load", function() {
	_statusbar = document.getElementById("status");
	_console = document.getElementById("console");
	_editor = ace.edit("editor");
	_consoleEditor = ace.edit("consoleInput");
	_editor.setOptions({
			theme: 'ace/theme/ayu-dark',
			wrap: true,
			behavioursEnabled: false,
			showInvisibles: false,
			enableSnippets: true,
			displayIndentGuides: true,
			enableLiveAutocompletion: true,
			enableBasicAutocompletion: true,
			enableEmmet: true,
			fontSize: "20px",
			scrollPastEnd: true,
			useWorker: true,
			printMargin: false,
			tabSize: 4,
			fontFamily: "Inconsolata",
			mode: "ace/mode/javascript"
		});
		_consoleEditor.setOptions({
			theme: 'ace/theme/ayu-dark',
			wrap: true,
			highlightActiveLine: false,
			showInvisibles: false,
			enableSnippets: false,
			displayIndentGuides: true,
			enableLiveAutocompletion: false,
			enableBasicAutocompletion: false,
			enableEmmet: false,
			fontSize: "1em",
			printMargin: false,
			tabSize: 4,
			minLines: 1,
			maxLines: 100,
			hScrollBarAlwaysVisible: false,
			vScrollBarAlwaysVisible: false,
			showGutter: false,
			fontFamily: "Inconsolata",
			mode: "ace/mode/javascript"
		});

   	_editor.getSelection().on("changeCursor", function(e, selection) {
   		_statusbar.innerHTML = "Line " + (selection.lead.row+1) + ", Column " + selection.lead.column;
   	});
   	_consoleEditor.on("change", function(e) {
			var newHeight = _consoleEditor.getSession().getScreenLength() * _consoleEditor.renderer.lineHeight + _consoleEditor.renderer.scrollBar.getWidth();
			_consoleEditor.container.style.height = newHeight + "px";
			_consoleEditor.resize();
   	});
    _consoleEditor.commands.addCommand({
      name: "History Up",
      bindKey: {win: "Up", mac: "Up"},
      exec: function(e) {
				if(e.getSelectionRange().start.row === 0) {
					if(_historyIndex === _history.length-1) {
						_history[_historyIndex] = e.getValue().replace(/^\s*/g, '').replace(/\s*$/g, '');
					}
					if(_historyIndex > 0) {
						e.setValue(_history[--_historyIndex], 1);
					}
				}
				else {
					e.getSession().getSelection().moveCursorBy(-1, 0);
				}
      }
    });
    _consoleEditor.commands.addCommand({
      name: "History Down",
      bindKey: {win: "Down", mac: "Down"},
      exec: function(e) {
				if(e.getSelectionRange().end.row === e.getSession().getDocument().getLength() - 1) {
					if(_historyIndex < _history.length-1) {
						e.setValue(_history[++_historyIndex], 1);
					}
				}
				else {
					e.getSession().getSelection().moveCursorBy(1, 0);
				}

      }
    });

   	window.addEventListener('mousemove', _mouseMove);
   	window.addEventListener('mouseup', _mouseUp);
   	window.addEventListener('resize', function() {_editor.resize();_consoleEditor.resize();});
   	_editor.resize();
		_consoleEditor.resize();
});


//Actual Cool Part
function _runJavascript(text) {
	try {
		const f = new Function(text);
		f();
	}
	catch(exception) {
		console.error(exception);
	}
}
function _clearLog() {
	_console.firstElementChild.innerHTML = "";
}

//Redefine console functions
console.reallog = console.log;
console.log = function() {
	var line = document.createElement('div');
	line.className = 'consoleLine';

	var content = [];
	for(var i = 0;i < arguments.length;++i) {
		content.push(_consoleParse(arguments[i]));
	}
	line.innerHTML = content.join("<br>");

	if(line.innerHTML.replace(/\s/g, '') !== "") {
		_console.firstElementChild.appendChild(line, _console.firstElementChild);
	}
}
console.realerror = console.error;
console.error = function() {
	var line = document.createElement('div');
	line.className = 'consoleLine error';
	line.textContent = [].join.call(arguments, "<br>");
	_console.firstElementChild.appendChild(line, _console.firstElementChild);
}

function _consoleParse(arg) {
	if(typeof arg === "boolean" || typeof arg === "undefined" || arg === null) {
		return '<span class="ace_constant ace_language">'+arg.toString()+'</span>';
	}
	else if(typeof arg === "string") {
		return '<span class="ace_string">"'+arg+'"</span>';
	}
	else if(typeof arg === "number") {
		return '<span class="ace_constant ace_numeric">'+arg+'</span>';
	}
	else if(arg instanceof HTMLElement) {
		return '<span class="ace_string">"'+escapeHtml(arg.outerHTML)+'"</span>';
	}
	else if(arg instanceof Array) {
		var tokens = [];
		arg.forEach(function(x) {
			tokens.push(_consoleParse(x));
		});
		return "[" + tokens.join(", ") + "]";
	}
	else if(arg instanceof Object ) {
		var tokens = [];
		Object.keys(arg).forEach(function(key) {
			tokens.push(_consoleParse(key) + ": " + _consoleParse(arg[key]));
		});
		return "{" + tokens.join(", ") + "}";
	}
	return arg.toString();
}


function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}



//Ui Stuff
var _resizing = false;
var _resizeData = {}
var _resizPos = 0;

function _mouseMove() {
	if(_resizing) {
		_resizPos = event.clientX;
		if(_resizPos > _resizeData.elem.parentNode.offsetWidth) {_resizPos = _resizeData.elem.parentNode.offsetWidth;}
		else if(_resizPos < 200) {_resizPos = 200;}
		_resizPos /= _resizeData.elem.parentNode.offsetWidth;

		_resizeData.elem.parentNode.style.gridTemplateColumns = _resizPos*100 + '% 1fr';		
		_resizeData.elem.style.left = "calc( " + _resizPos*100 + "% - 3px)";
		_editor.resize();
		_consoleEditor.resize();
	}
}
function _mouseUp() {
	if(_resizing) {
		_resizing = false;
	}
}

function _keyDown(event) {
	if(event.code === 'Enter' && !event.shiftKey) {
		var val = _consoleEditor.getValue().replace(/^\s*/g, '').replace(/\s*$/g, '');
		if(val.replace(/\s/g, '') === "") {return;}
		var content = _consoleEditor.container.querySelector(".ace_layer.ace_text-layer").innerHTML;
		_console.firstElementChild.innerHTML += '<div class="consoleLine">'+content+'</div>';
		_runJavascript(val);
		_history.push("");
		_historyIndex = _history.length-1;
		_history[_historyIndex - 1] = val;
		_consoleEditor.setValue("", -1);
		event.preventDefault();
	}
}