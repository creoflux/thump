// Thump 
// Copyright (c) 2014 CreoFlux, LLC
// @license magnet:?xt=urn:btih:5305d91886084f776adcf57509a648432709a7c7&dn=x11.txt X11 License

//audio related
var _audioContext;
var _decodedSamples = null;

//canvas layers
var _waveformLayer;
var _lineLayer;
var _topLayer; 

//context
var _waveformContext;
var _lineContext;
var _topContext;

//canvas sizes
var _canvasWidth = 1024;
var _canvasHeight = 200;

//markers
var _markers = [];

function init() {
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    _audioContext = new AudioContext();
    
    _waveformLayer = document.getElementById('waveformLayer');
    _lineLayer     = document.getElementById('lineLayer');
    _topLayer      = document.getElementById('topLayer'); 

    _waveformContext = _waveformLayer.getContext('2d');
    _lineContext     = _lineLayer.getContext('2d');
    _topContext      = _topLayer.getContext('2d');
    
    _waveformLayer.width = _canvasWidth;
    _waveformLayer.height = _canvasHeight;

    _lineLayer.width = _canvasWidth;
    _lineLayer.height = _canvasHeight;

    _topLayer.width = _canvasWidth;
    _topLayer.height = _canvasHeight;


    _waveformContext.fillStyle = "#ddd";
    _waveformContext.fillRect(0, 0, _canvasWidth, _canvasHeight);
    _waveformContext.shadowOffsetX = 5;
    _waveformContext.shadowOffsetY = 5;
    _waveformContext.shadowBlue = 4;
    _waveformContext.shadowColor = 'rgba(0,0,127,0.2)';
    _waveformContext.strokeStyle = '#0275d8';
    _waveformContext.lineWidth = 1;
    
    
    _topLayer.onmousemove = function(e){
        clearCanvas(_topContext);
    
        if(e.ctrlKey  || e.metaKey ){
            drawVertLine(_topContext, e.layerX, 'rgba(24, 220, 24, 0.8)');
        }else{
            var slice = findSlice(e.layerX);
            
            _topContext.fillStyle = 'rgba(24, 220, 24, 0.5)';
            _topContext.fillRect(slice.start, 0, slice.end - slice.start, _canvasHeight);
        }
    
    };

    _topLayer.onclick = function(e){
    
        if(_decodedSamples === null) { return; }
    
        if(e.ctrlKey || e.metaKey){
            _markers.push(e.layerX);
            drawMarkerLine(_lineContext, e.layerX);
        }else {
            var slice      = findSlice(e.layerX);
            var scale = (_decodedSamples.duration / _canvasWidth);
            var startSec = scale * slice.start;
            var endSec   = scale * (slice.end - slice.start);
            
            if (e.shiftKey){
                addSequencerRow(startSec, endSec);
            }else{
                playSound(_decodedSamples, startSec, endSec);
            }
        }

    };

    document.getElementById('autoSliceSensitivity').addEventListener('change', function(){
        if(_decodedSamples != null){

            clearCanvas(_topContext);
            
            removeAllMarkers();
            
            detectBeats(document.getElementById('autoSliceSensitivity').value);
        }
    });

    
    document.getElementById('fileInput').addEventListener('change', openFile, false);
        
  }
  catch(e) {
    alert('Web Audio API not supported!');
  }
}


function playSample(buffer, time, startSec, endSec, pitchAmount) {
    var source = _audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = pitchAmount;
    source.connect(_audioContext.destination);
    source.start(time, startSec, endSec);
}


function playSound(buffer, startSec, endSec){
    var source = _audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(_audioContext.destination);
    source.start(0, startSec, endSec);
}

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

function playLoop(){

    var dataAll = document.querySelectorAll("[data-id]");

    var bpm = document.getElementById('bpm').value;
    var loopTimes = document.getElementById('loopTimes').value;
    var sixteenthTime = 15.0 / bpm;
    
    var slopAmount = parseFloat(document.getElementById('slopAmount').value);
    var minSlop = -(6.0 / bpm);
    var maxSlop =  (6.0 / bpm);

    var pitchAmount = parseFloat(document.getElementById('pitchAmount').value);
    
    var time = _audioContext.currentTime + 0.400;
    
    for(var k = 0; k < loopTimes; k++){
    
        for(var i = 0; i < dataAll.length; i++){
            var id = parseInt(dataAll[i].dataset.id);
            
            if(dataAll[i].dataset.on == 'true'){
                var startTime = dataAll[i].dataset.startTime;
                var endTime = dataAll[i].dataset.endTime;
                
                var pitchOffset = dataAll[i].pitchAmount();
                                
                playSample( _decodedSamples, 
                            time + (sixteenthTime * id) + (slopAmount * getRandom(minSlop, maxSlop)), 
                            startTime, 
                            endTime, 
                            pitchAmount + pitchOffset );
            }
        }
        
        time += (sixteenthTime * 16);
    }
}


function createSequencerButton(i, startTime, endTime, pitchInput){

    var button = document.createElement('button');
    button.dataset.id = i;
    
    button.onclick = function () {
        if(button.dataset.on == 'true'){
            button.dataset.on = 'false';
            button.className = i % 4 == 0 ? "beatButton" : "normalButton";
                
        }else{
            button.dataset.on = 'true';
            button.className = i % 4 == 0 ? "selectedBeatButton" : "selectedButton";            
        }
        
    };
    
    button.pitchAmount = function (){
        return parseFloat(pitchInput.value);
    };
    
    button.dataset.startTime = startTime;
    button.dataset.endTime = endTime;
    button.className = i % 4 == 0 ? "beatButton" : "normalButton";
    
    return button;
}

function addSequencerRow (startTime, endTime) {

    var sequencer = document.getElementById('sequencer');    
    var div = document.createElement('div');
    
    var removeButton = document.createElement('button');
    removeButton.className = "removeButton"
    div.appendChild(removeButton);
    
    removeButton.onclick = function (){
        sequencer.removeChild(div);
    };
    
    var previewButton = document.createElement('button');
    previewButton.className = "previewButton"
    div.appendChild(previewButton);
    
    previewButton.onclick = function (){
        var pitchAmount = parseFloat(document.getElementById('pitchAmount').value) + parseFloat(pitchInput.value);
        playSample(_decodedSamples, _audioContext.currentTime + 0.000, startTime, endTime, pitchAmount);
    };
    
    var pitchInput = document.createElement('input');
    pitchInput.type="range";
    pitchInput.min="0.1";
    pitchInput.max="1.0";
    pitchInput.step="0.01";
    pitchInput.value="0.5";

    div.appendChild(pitchInput);
    
    div.className = 'sequencerRow';
    
    for(var i = 0; i < 16; i++){
        var btn = createSequencerButton(i, startTime, endTime, pitchInput);
        div.appendChild(btn);
    }    
    
    sequencer.appendChild(div);
}

function removeAllSequencerRows(){
    document.getElementById('sequencer').innerHTML = '';
}


function removeAllMarkers(){

    var markerElements = document.querySelectorAll('.markerLine');
    
    for(var i = markerElements.length - 1; i >=0; i--){
        document.getElementById('canvasHost').removeChild(markerElements[i]);
    }
    
    _markers = [];
}

function drawMarkerLine(context, x){

    var markerLine = document.createElement('div');
    markerLine.className = "markerLine";
    markerLine.style.left = x + "px";
    markerLine.style.width = 5 + "px";
    document.getElementById("canvasHost").appendChild(markerLine);
      
    markerLine.onmouseleave = function (){
            markerLine.style.color = "red";
    };
   
    markerLine.onclick = function(){
        removeMarker(x);
        clearCanvas(_topContext);
        document.getElementById('canvasHost').removeChild(markerLine);
    };
}

function removeMarker(value){

    for(var i = _markers.length - 1; i >= 0; i--){
            if(_markers[i] == value){
                _markers.splice(i,1);
            }
    }
}

function findSlice(x){
   
    if(_markers.length === 0){
        return { start : 0, end : 0 };
    }
   
    _markers.sort(function(a, b) { return a - b });
   
    var start = 0;
    var end   = _markers[0];
    var markersLen = _markers.length;
   
    for(var i = 0; i < markersLen; i++){
        if(_markers[i] < x){
            start = _markers[i];
            end = _canvasWidth;
           
            if( (i+1) < markersLen){
                end = _markers[i + 1];
            }
        }
    }
   
    return { start, end };
}

function clearCanvas(context){

    context.save();
   
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
   
    context.restore;
}

function fillBackground(context){
    context.fillStyle = "#ddd";
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}

function drawVertLine(context, x, lineColor){

    context.shadowOffsetX = -2;
    context.shadowOffsetY = -2;
    context.shadowBlur = 4;
    context.shadowColor = 'rga(127, 127, 0, 0.5)';
   
    context.strokeStyle = lineColor;
    context.lineWidth = 1;
   
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, context.canvas.height);
    context.stroke();
}

function drawWaveform(channelData, context2d, height, width){
    var step = 1;
    var len  = channelData.length;
    var mid = height / 2;
   
    context2d.beginPath();
    context2d.moveTo(0,mid);
   
    for(var i = 0; i < len; i += step){
        context2d.lineTo(i * (width / len), channelData[i] * mid + mid);
    }
   
    context2d.stroke();
}

var openFile = function(event){
    var reader = new FileReader();
    var firstFile = event.target.files[0];
      
    reader.onload = function(){
        _audioContext.decodeAudioData(reader.result)
        .then(fileDecodeDone);
    };
   
    reader.readAsArrayBuffer(firstFile);
}

function fileDecodeDone(decodedData){

    _decodedSamples = decodedData;
    
    clearCanvas(_waveformContext);
    fillBackground(_waveformContext);
    
    clearCanvas(_topContext);
    
    removeAllMarkers();
    
    removeAllSequencerRows();
    
    drawWaveform(decodedData.getChannelData(0), _waveformContext, _canvasHeight, _canvasWidth);
    
    if(document.getElementById('autoSlice').checked){
        detectBeats(document.getElementById('autoSliceSensitivity').value);
    }
}


function computeE(data, start, end){
    var sum = 0;
    
    for(var i =start; i < end; i++){
        sum += data[i] * data[i];
    }
    
    return sum;
}

function detectBeats(sensitivity){
    var leftData = _decodedSamples.getChannelData(0);
    
    var windowSize = 512;
    
    var lastE = computeE(leftData, 0, windowSize);
    
    for(var i=leftData.length - windowSize; i > 0 ; i-=windowSize){
        var E = computeE(leftData, i, i + windowSize);
        
        if( (lastE - E) > sensitivity ){

            var scale = (leftData.length / _canvasWidth);
            var x = i / scale;

            _markers.push(x);
            drawMarkerLine(_lineContext, x);
        }
        lastE = E;
    }
    
}




window.addEventListener('load', init, false);

// @license-end
