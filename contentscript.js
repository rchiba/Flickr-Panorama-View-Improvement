/*
 * Copyright (c) 2010 The Chromium Authors. All rights reserved.  Use of this
 * source code is governed by a BSD-style license that can be found in the
 * LICENSE file.
 */

console.log("Contentscript.js is running.");

// Sizing parameters
var rBoxes = []; //Boxes array
var rText= []; //Titles of each box
var timeText=[]; //Time labels
var vLines= [];
var paper;
var photoPaper;
var a=0;
var b=0;
var width=800; // width of timeline
var height=50; // height of timeline
var focusHeight=0;
var focusWidth=0;
var contextHeight=30;
var handleWidth=10;
var paneWidth=width-handleWidth*2;
var focusMarginTop=0;
var textMarginLeft=10;
var textMarginTop=10;
var panelOpacity=.2;
var arrowSize=10;
var imageWidth=0;
var imageHeight=0;
var aspectRatio=0;
var marginLeft=0;
var marginTop=0;
var maxHeight;

$(document).ready(function(){
	$(".hd").append("<div id='notepad' style='margin-top:5px;'></div>");
	$("img.loaded:first").append("<div id='notepad2' style='margin-top:5px;'></div>");
	$("#photo-lightbox-other-controls").prepend("<li class='first'><a id='panoViewButton' class='Butt' href='#'>Pano view</a></li>");
	// Calculate some values - strip of the px
	imageWidth=parseFloat($("img.loaded:first").css("width"));
	imageHeight=parseFloat($("img.loaded:first").css("height"));
	aspectRatio=imageHeight/imageWidth;
	marginLeft=parseFloat($("img.loaded:first").css("margin-left"));
	marginTop=parseFloat($("img.loaded:first").css("margin-top"));
	console.log("Image height and width: "+imageHeight+" "+imageWidth);
	console.log("Aspect ratio: "+aspectRatio);
	// setup periodic sending of data to Nikhil
	window.setInterval(sendStat, 2000);
	// setup pano view button
	$("#panoViewButton").click(activatePanoView);
	
	// This is for adding statistics to the statistics page
	if ($("#refs") == true) {
		$("<div id='hotspots'><h2 class='hotspots'>Panorama Hotspots</h2></div>").insertBefore('#refs');
		$("#hotspots").append("<img id='hotspotIMG' src='' />");
		var photoID = urlToID($(".pc_img:first").attr("src"));
		chrome.extension.sendRequest({'action' : 'requestStat','imageURL':photoID}, onRequestStatResponse);
	}
	
});

// This is triggered when the "pano view" button is first clicked
function activatePanoView(){
	// if the aspect ratio is strange enough to merit extra controls,
	if (aspectRatio < .4) { // This is a magic number 
		// Create canvas
		paper = Raphael(document.getElementById("notepad"), width, height);
		photoPaper = Raphael(document.getElementById("notepad2"), imageWidth, imageHeight);
		// Create base
		constructBase();
		initPanel();
		fetchOriginal();
	}
}

// This is triggered every couple seconds and sends data back to nikhil
function sendStat(){
	chrome.extension.sendRequest({'action' : 'sendStat','leftPos':a,'rightPos':b}, onSendStatResponse);
}

// this function takes in a flickr url and returns the id
function urlToID(url){
	var crap = url.toString().split("_")[0].split("/");
	console.log("urlToID: ");
	console.log(crap);
	console.log(crap[crap.length-1]);
	return crap[crap.length-1];
}

function fetchOriginal(){
	// Grab the original image - gave up on AJAX, I'm going to find it in the DOM
	//console.log("sending request");
	//
	var photoID = urlToID($("img.loaded:first").attr("src"));
	chrome.extension.sendRequest({'action' : 'fetchFlickrInfo','photoID':photoID}, onFlickrResponse);
	var originalURL = "";
	var raw = $("#share-options-embed-textarea-o").html().split(";")
	$.each(raw,function(index,value){
		var foo = value.toString();
		if(foo.indexOf("_o.")!=-1){
			//found the right url
			originalURL=foo;
		}
	});
	originalURL = originalURL.split("\"")[1];
	console.log(originalURL);
	// I NOW HAVE THE ORIGINAL URL
	// Send Original URL to Nikhil's backend
	chrome.extension.sendRequest({'action' : 'requestLarge','originalURL':originalURL,'maxHeight':maxHeight}, onRequestLargeResponse);
	
	
}

// function to place high resolution URL in place of low resolution URL
function pasteHiRes(originalURL){
	// make the image the original URL
	$("img.loaded:first").attr("src",originalURL);
}

// function triggered once flickr responds with information to load the original image
function onFlickrResponse(data){
	var farmID =  $(data).find("photo").attr("farm")
	var serverID =  $(data).find("photo").attr("server")
	var photoID =  $(data).find("photo").attr("id")
	var oSecret =  $(data).find("photo").attr("originalsecret");
	var originalFormat = $(data).find("photo").attr("originalformat");
	var originalURL = "http://farm"+farmID+".static.flickr.com/"+serverID+"/"+photoID+"_"+oSecret+"_o."+originalFormat
	console.log("Original image response received: "+originalURL);
}

// function triggered once Nikhil sends back a correctly sized large image
function onRequestLargeResponse(data){
	console.log("requestLargeResponse:");
	console.log(data);
	// Here I'll have the url to the large image,
	pasteHiRes(data.largeURL);
}

// function triggered once Nikhil gets a sendStat
function onSendStatResponse(data){
	//nothing, don't need to do anything
}

// function triggered once Nikhil sends back a statistic visualization
function onRequestStatResponse(data){
	// render it somewhere
	$("#hotspotIMG").attr("src", data.url);
}

// Function to create grid framework
function constructBase()
{
	var largeImage = $("img.loaded").attr("src");
	// Create context panel
	context = paper.image(largeImage,0, focusHeight, width, contextHeight);
	// Create focus panel
	focus = paper.rect(0,0, focusWidth,focusHeight);
	focus.attr({fill: "#fff",stroke:"none"});
	
	
}// End contsructBase()

function initPanel(){ // function to initialize panel
	var cPane = paper.rect(width-handleWidth-paneWidth, focusHeight,paneWidth, contextHeight);
	cPane.attr({fill: "white", opacity:panelOpacity, stroke:"white"});
	var cHandleL = paper.rect(width-2*handleWidth-paneWidth, focusHeight,handleWidth, contextHeight+10);
	cHandleL.attr({fill: "white", opacity:panelOpacity+.3, stroke:"white"});
	var cHandleR = paper.rect(width-handleWidth, focusHeight,handleWidth, contextHeight+10);
	cHandleR.attr({fill: "white", opacity:panelOpacity+.3, stroke:"white"});
	
	updateFocus(cPane,cHandleR,cHandleL);
	// Center drag interactions
	var start = function () {
		// storing original coordinates
		cPane.ox = cPane.attr("x");
		cPane.oy = cPane.attr("y");
		cPane.ow = cPane.attr("width");
		cHandleL.ox = cHandleL.attr("x");
		cHandleL.oy = cHandleL.attr("y");
		cHandleR.ox = cHandleR.attr("x");
		cHandleR.oy = cHandleR.attr("y");
	},
	// move function for center area, just translates entire block
	moveC = function (dx, dy) {
		// Limiting movement to canvas area
		nowX = Math.max(0, cPane.ox + dx-handleWidth);
		nowX = Math.min(width-cPane.ow-2*handleWidth, nowX);
		cPane.attr({x: nowX+handleWidth});
		cHandleL.attr({x: nowX});
		cHandleR.attr({x: nowX+handleWidth+cPane.ow});
		updateFocus(cPane,cHandleR,cHandleL);
	},
	// move function for left handle, resizes the target area
	moveL = function (dx, dy) {
		// if the image is not too big or if I'm dragging left
		if(!isTooHigh()||dx<0){
			// Limiting movement to canvas area
			nowX = Math.max(0, cHandleL.ox + dx);
			nowX = Math.min(cHandleR.ox-handleWidth, nowX);
			cPane.attr({width: cPane.ow + (cHandleL.ox-nowX),x: nowX+handleWidth});
			cHandleL.attr({x: nowX});
			updateFocus(cPane,cHandleR,cHandleL);
		}
		
	},
	// move function for right handle, resizes target area
	moveR = function (dx, dy) {
		// if the image is not too big or if I'm right
		if (!isTooHigh() || dx > 0) {
			// Limiting movement to canvas area
			nowX = Math.max(cPane.ox, cHandleR.ox + dx);
			nowX = Math.min(width - handleWidth, nowX);
			cPane.attr({
				width: nowX - cHandleL.ox - handleWidth
			});
			cHandleR.attr({
				x: nowX
			});
			updateFocus(cPane, cHandleR, cHandleL);
		}
	},
	up = function () {
	};
	cPane.drag(moveC, start, up);
	cHandleL.drag(moveL, start, up);
	cHandleR.drag(moveR, start, up);
	context.drag(moveC, start, up);
	
	// Change the attributes of the image depending on cPanel and handles
	function updateFocus(cPane,cHandleR,cHandleL){
		var widthMultiplier=0;
		// these are the positions of the handle edges
		a = cHandleL.attr('x');
		b = cHandleR.attr('x')+cHandleR.attr('width');
		// width multiplier scales based on width of context selection region
		var widthMultiplier = width/(b-a);
		// calculate width from handles
		$("img.loaded:first").css("width", imageWidth*widthMultiplier);
		$("img.loaded:first").css("height", imageWidth*widthMultiplier*aspectRatio);
		// time for positioning calculation
		var currentWidth = $("img.loaded").width();
		$("img.loaded:first").css("margin-left", -1*a/width*currentWidth);
		// time for compensating for height, and keeping the picture vertically centered
		var heightDifference = imageHeight-$("img.loaded:first").height();
		$("img.loaded:first").css("margin-top", (marginTop+heightDifference/2.75));
		// time to move attribution down
		$(".lightbox-meta-attribution:first").css("margin-top",marginTop-heightDifference/1.5);
	}// End updateFocus()
	
	// Checks if image height threshold is reached
	function isTooHigh(){
		var iHeight = parseFloat($("img.loaded:first").css("height"));
		var navHeight = 800; // This is a magic number
		maxHeight = $(document).height() - navHeight;
		if(iHeight>=maxHeight){
			return false;
		}
		else{
			return false;
		}
	}

}//End initpanel



