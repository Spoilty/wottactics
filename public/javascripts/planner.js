if (Modernizr.websockets) {
	var socket = io({
		reconnectionDelay: 100,
		reconnectionDelayMax: 500,
		'reconnection limit' : 1000,
		'max reconnection attempts': Infinity
	});	
} else {
	var socket = io({
		transports: ['polling'],
		reconnectionDelay: 100,
		reconnectionDelayMax: 500,
		'reconnection limit' : 1000,
		'max reconnection attempts': Infinity
	});	
}

//generates unique ids
function newUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
    function(c) {
      r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
}

function is_chrome() {
	return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
}
function is_firefox() {
	return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}
function is_safari() {
	return navigator.vendor && navigator.vendor.indexOf('Apple') > -1;
}
function is_ie() {
	return navigator.userAgent.toLowerCase().indexOf('msie') > -1 || navigator.userAgent.toLowerCase().indexOf('trident') > -1;
}

var image_host;
if (is_safari()) {
	image_host = 'http://'+location.host+'/icons/'; //enable for local image hosting
} else {
	image_host = "http://karellodewijk.github.io/icons/";
}
	
var assets;
var game = $('meta[name=game]').attr("content");
if (game == "wows") { //wows
	assets = [image_host+"bb.png", image_host+"cv.png", image_host+"ca.png", image_host+"dd.png"];
} else if (game == "blitz") {
	assets = [image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"td.png", image_host+"arty.png"];	
} else if (game == "aw") {
	assets = [image_host+"aw_afv.png", image_host+"aw_lt.png", image_host+"aw_mbt.png", image_host+"aw_spg.png", image_host+"aw_td.png"];
} else {
	assets = [image_host+"light.png", image_host+"medium.png", image_host+"heavy.png", image_host+"arty.png", image_host+"td.png"];	
}

assets.push(image_host+"circle.png", image_host+"recticle.png", image_host+"dot.png", image_host+"note.png", image_host+"cursor.png", image_host+"grid.png");

var loader = PIXI.loader; 
for (var i in assets) {
	loader.add(assets[i], assets[i]);
}
loader.load();

var last = function(array) {
	return array[array.length-1];
};

function random_darkish_color(){
    var r = (Math.round(Math.random()* 127)).toString(16);
    var g = (Math.round(Math.random()* 127)).toString(16);
    var b = (Math.round(Math.random()* 127)).toString(16);
    return '#' + r + g + b;
}

var chat_color = random_darkish_color();
var room_data;
var min_draw_point_distance = 0.01;
var active_slide = 0;
var min_draw_point_distance_sq = min_draw_point_distance * min_draw_point_distance;
var min_polygon_end_distance = 0.01; //in ratio to width of map
var min_polygon_end_distance_touch = 0.025;
var min_track_move_distance = 0.01;
var min_track_move_distance_sq = min_track_move_distance * min_track_move_distance;
var active_context = 'ping_context';
var userlist = {};
var selected_icon;
var icon_extra_scale = 1;
var icon_color = 0xff0000;
var draw_color = 0xff0000;
var ping_color = 0xff0000;
var track_color = 0xff0000;
var line_color = 0xff0000;
var curve_color = 0xff0000;
var text_color = 0xffffff;
var background_text_color = 0x000000;
var rectangle_outline_color = 0xff0000;
var rectangle_fill_color = 0xff0000;
var circle_outline_color = 0xff0000;
var circle_fill_color = 0xff0000;
var polygon_outline_color = 0xff0000;
var polygon_fill_color = 0xff0000;
var area_outline_color = 0xff0000;
var area_fill_color = 0xff0000;
var room;
var background;
var draw_thickness;
var curve_thickness;
var line_thickness;
var icon_size;
var rectangle_outline_thickness;
var rectangle_outline_opacity;
var rectangle_fill_opacity;
var circle_outline_thickness;
var circle_outline_opacity;
var circle_fill_opacity;
var polygon_outline_thickness;
var polygon_outline_opacity;
var polygon_fill_opacity;
var area_outline_thickness;
var area_outline_opacity;
var area_fill_opacity;
var my_user;
var undo_list = [];
var redo_list = [];
var is_room_locked;
var tactic_name = "";
var graphics;
var new_drawing;
var left_click_origin;
var selected_entities = [];
var previously_selected_entities = [];
var label_font_size = 30;
var last_ping_time;
var icon_scale = 0.025;
var icon_brightness;
var note_scale = 0.05;
var thickness_scale = 0.0015;
var font_scale = 0.002;
var trackers = {};
var my_tracker;
var last_track_position;
var tracker_width = 0.05;
var tracker_height = 0.05;
var my_user_id;
var clipboard = [];
var slide_name;
var assets_loaded = false;

//keyboard shortcuts
var shifted; //need to know if the shift key is pressed
$(document).on('keyup keydown', function(e) {
	shifted = e.shiftKey;	
	if (document.activeElement.localName != "input") {	
		if (e.type == "keyup") {
			if (e.ctrlKey) {
				if (e.keyCode==90) {
					undo();
				} else if (e.keyCode==89) {
					redo();
				} else if (e.keyCode==83) {
					if (my_user.logged_in && tactic_name && tactic_name != "" && socket) {
						socket.emit("store", room, tactic_name);
					}
				} else if (e.keyCode==67) {
					copy();
				} else if (e.keyCode==88) {
					cut();
				} else if (e.keyCode==86) {
					paste();
				}
			} else if (e.keyCode==46) {
				clear_selected();
			} else if (e.keyCode==16) {
				if (active_context == 'line_context' && new_drawing) {
					on_line_end(e);
				}
			}
		}
	}
});

function cut() {
	copy();
	clear_selected();
}

function copy() {
	clipboard = [];
	for (var i in selected_entities) {
		var temp = selected_entities[i].container;
		delete selected_entities[i].container;
		clipboard.push(JSON.parse(JSON.stringify(selected_entities[i])));
		selected_entities[i].container = temp;
	}	
}

function paste() {
	if (clipboard.length == 0) {
		return;
	}
	deselect_all();
	var mouse_location = renderer.plugins.interaction.mouse.global;
	var mouse_x = mouse_x_rel(mouse_location.x);
	var mouse_y = mouse_y_rel(mouse_location.y);
	if (Math.abs(mouse_x) > 1 || Math.abs(mouse_y) > 1) {
		mouse_x = mouse_y = 0;
	}	
	var top = 1;
	var left = 1;
	for (var i in clipboard) {				
		top = Math.min(top, clipboard[i].y);
		left = Math.min(left, clipboard[i].x);
	}
	
	var new_entities = [];
	for (var i in clipboard) {
		var entity = JSON.parse(JSON.stringify(clipboard[i]))
		entity.uid = newUid();
		entity.x = mouse_x + (entity.x - left);
		entity.y = mouse_y + (entity.y - top);
		new_entities.push(entity);
		create_entity(entity);
		snap_and_emit_entity(entity);
		selected_entities.push(entity);
	}
	
	undo_list.push(["add", new_entities]);	
	select_entities();
	renderer.render(stage);
}

//start pixi renderer
var border = 30;
var size = Math.min(window.innerHeight, window.innerWidth) - border;
var size_x = size;
var size_y = size;

var renderer = PIXI.autoDetectRenderer(size, size,{backgroundColor : 0xBBBBBB});

var useWebGL = renderer instanceof PIXI.WebGLRenderer;

// create the root of the scene graph
var stage = new PIXI.Container();
var objectContainer = new PIXI.Container();
stage.addChild(objectContainer);

//initialize background
var background_sprite = new PIXI.Sprite();
background_sprite.height = renderer.height;
background_sprite.width = renderer.width;
objectContainer.addChild(background_sprite);

//initialize grid layer
var grid_layer = new PIXI.Sprite.fromImage(image_host + "grid.png");
grid_layer.height = renderer.height;
grid_layer.width = renderer.width;
objectContainer.addChild(grid_layer);


var draw_canvas = document.createElement("canvas");
$(draw_canvas).attr('style', 'position:absolute; z-index:'+ 2 + '; pointer-events:none');
draw_canvas.width = size_x;
draw_canvas.height = size_y;
draw_context = draw_canvas.getContext("2d");

var temp_draw_canvas = document.createElement("canvas");
$(temp_draw_canvas).attr('style', 'position:absolute; z-index:'+ 3 + '; pointer-events:none');
temp_draw_canvas.width = size_x;
temp_draw_canvas.height = size_y;
temp_draw_context = temp_draw_canvas.getContext("2d");

//resize the render window
function resize_renderer(new_size_x, new_size_y) {
	var last_size_x = size_x;
	var last_size_y = size_y;
	size_x = new_size_x;
	size_y = new_size_y;
	objectContainer.scale.x *= size_x/last_size_x;
	objectContainer.scale.y *= size_y/last_size_y;	
	renderer.resize(size_x, size_y);
	
	draw_canvas.width = size_x;
	draw_canvas.height = size_y;
	temp_draw_canvas.width = size_x;
	temp_draw_canvas.height = size_y;
	
	$("#render_frame").attr('style', 'height:' + size_y + 'px; width:' + size_x + 'px;');
	
	for (var i in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities[i]) {
			if (room_data.slides[active_slide].entities[i].type == 'note') {
				align_note_text(room_data.slides[active_slide].entities[i]);
			} else if (room_data.slides[active_slide].entities[i].type == 'text') {
				var entity = room_data.slides[active_slide].entities[i];
				remove(entity.uid);
				create_entity(entity);
			}
		}
	}
	renderer.render(stage);
};

window.onresize = function() {
	size = Math.min(window.innerHeight, window.innerWidth) - border;
	if (size_x > size_y) {
		resize_renderer(size, size * size_y / size_x);
	} else {
		resize_renderer(size * size_x / size_y, size);
	}
};

function x_rel(x) {
	return x*objectContainer.scale.x/size_x;
}

function x_abs(x) {
	return x*size_x/objectContainer.scale.x;
}

function y_rel(y) {
	return y*objectContainer.scale.y/size_y;
}

function y_abs(y) {
	return y*size_y/objectContainer.scale.y;
}

function mouse_x_abs(x) {
	return x;
}

function mouse_y_abs(y) {
	return y;
}

function mouse_x_rel(x) {
	return x * objectContainer.scale.x / size_x;
}

function mouse_y_rel(y) {
	return y * objectContainer.scale.y / size_y;
}

function set_background(new_background) {
	background = new_background;
	
	if (background.path != "") {
		background_sprite.texture = PIXI.Texture.fromImage(background.path);
	} else {
		var empty_backround = new PIXI.Graphics();
		empty_backround.beginFill(0xFFFFFF, 1);
		empty_backround.moveTo(0, 0);
		empty_backround.lineTo(renderer.width, 0);
		empty_backround.lineTo(renderer.width, renderer.height);
		empty_backround.lineTo(0, renderer.height);
		empty_backround.lineTo(0, 0);
		empty_backround.endFill();
		background_sprite.texture = empty_backround.generateTexture();
	}

	history[background.uid] = background;
	$("#map_select").val(background.path).change();	
	renderer.render(stage);
	background_sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	
	room_data.slides[active_slide].entities[new_background.uid] = new_background;
}

var context_before_drag;
var last_mouse_location;
var move_selected;
function on_drag_start(e) {
	if (is_room_locked && !my_user.role) {
		if (this.entity.type == 'note') {
			this.mouseup = toggle_note;
			this.touchend = toggle_note;
			this.mouseupoutside = toggle_note;
			this.touchendoutside = toggle_note;
		}
		return;
	}
	if (active_context != 'drag_context') {
		context_before_drag = active_context;
	}
	active_context = "drag_context";
	last_mouse_location = [mouse_x_abs(e.data.getLocalPosition(objectContainer).x), mouse_y_abs(e.data.getLocalPosition(objectContainer).y)];
	renderer.render(stage);
	
	this.mouseup = on_drag_end;
	this.touchend = on_drag_end;
	this.mouseupoutside = on_drag_end;
	this.touchendoutside = on_drag_end;
	this.mousemove = on_drag_move;
	this.touchmove = on_drag_move;

	move_selected = false;
	for (var i in selected_entities) {
		if (selected_entities[i].uid == this.entity.uid) {
			move_selected = true;
			break;
		}
	}
	
	if (!move_selected) {
		deselect_all();
		selected_entities = [this.entity];
		select_entities();
	}
	
	for (var i in selected_entities) {
		selected_entities[i].origin_x = selected_entities[i].x;
		selected_entities[i].origin_y = selected_entities[i].y;
	}
	this.origin_x = this.entity.x;
	this.origin_y = this.entity.y;
}

function toggle_note(e) {
	if (this.is_open) {
		this.is_open = false;
		align_note_text(this.entity);
	} else {
		this.is_open = true;
		align_note_text(this.entity);
	}	
}

function on_drag_end(e) {
	if (this.origin_x == this.entity.x && this.origin_y == this.entity.y) {	
		if (context_before_drag == 'remove_context') {
			remove(this.entity.uid);
			undo_list.push(["remove", [this.entity]]);
			socket.emit('remove', room, this.entity.uid, active_slide);
		} else if (this.entity.type == 'note') {
			toggle_note.call(this, e);
			deselect_all();
		}
	} else {
		var origin_entity_map = [];
		for (var i in selected_entities) {
			selected_entities[i].container.alpha = 1;
			origin = [selected_entities[i].origin_x, selected_entities[i].origin_y];
			origin_entity_map.push([origin, selected_entities[i]]);
			delete selected_entities[i].origin_x;
			delete selected_entities[i].origin_y;
			socket.emit("drag", room, selected_entities[i].uid, active_slide, selected_entities[i].x, selected_entities[i].y);
		}
		undo_list.push(["drag", origin_entity_map]);
	}
	this.mouseup = undefined;
	this.touchend = undefined;
	this.mouseupoutside = undefined;
	this.touchendoutside = undefined;
	this.mousemove = undefined;
	this.touchmove = undefined;
	active_context = context_before_drag;	
	renderer.render(stage);
}

//move an entity but keep it within the bounds
function move_entity(entity, delta_x, delta_y) {
	var new_x = entity.container.x + x_abs(delta_x);
	var new_y = entity.container.y + y_abs(delta_y);
	
	new_x = Math.max(new_x, 0);
	new_y = Math.max(new_y, 0);
	new_x = Math.min(new_x, x_abs(1 - x_rel(entity.container.width)));
	new_y = Math.min(new_y, y_abs(1 - y_rel(entity.container.height)));

	//move by relative positioning cause x on the container is the left upper corner of the bounding box
	//and for the entity this is mostly the start point
	
	drag_entity(entity, entity.x + x_rel(new_x - entity.container.x), entity.y + y_rel(new_y - entity.container.y));
}

function on_drag_move(e) {
	//move by deltamouse
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var delta_x = x_rel(mouse_x_abs(mouse_location.x) - last_mouse_location[0]);
	var delta_y = y_rel(mouse_y_abs(mouse_location.y) - last_mouse_location[1]);
	if (move_selected) {
		for (var i in selected_entities) {
			move_entity(selected_entities[i], delta_x, delta_y);
		}
	} else {
		move_entity(this.entity, delta_x, delta_y);
	}

	last_mouse_location = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
	renderer.render(stage);
}

function remove(uid, keep_entity) {
	if (room_data.slides[active_slide].entities[uid] && room_data.slides[active_slide].entities[uid].container) {
		if (room_data.slides[active_slide].entities[uid].type == "note") {
			room_data.slides[active_slide].entities[uid].container.menu.remove();
		}
		objectContainer.removeChild(room_data.slides[active_slide].entities[uid].container);
		delete room_data.slides[active_slide].entities[uid].container;
		
		if (room_data.slides[active_slide].entities[uid] && room_data.slides[active_slide].entities[uid].type == "icon") {
			try {
				var counter = $('#'+room_data.slides[active_slide].entities[uid].tank).find("span");
				counter.text((parseInt(counter.text())-1).toString());		
				counter = $("#icon_context").find("span").first();
				counter.text((parseInt(counter.text())-1).toString());
			} catch (e) {}
		}
	}
	

	
	//if an item is removed, remove them from selected_entities
	var i = selected_entities.length
	while (i--) {
		if (selected_entities[i].uid == uid) {
			selected_entities.splice(i, 1);
		}
	}
	
	if (!keep_entity) {
		delete room_data.slides[active_slide].entities[uid];	
	}
	renderer.render(stage);
}

function move_tracker(uid, delta_x, delta_y) {
	move_track_recursive(uid, delta_x * 0.1, delta_y * 0.1, 10);
}


function move_track_recursive(uid, step_x, step_y, count) {
	var timer = setInterval(function() {
		if (trackers[uid]) {
			trackers[uid].x += step_x;
			trackers[uid].y += step_y;
			trackers[uid].container.x += x_abs(step_x);
			trackers[uid].container.y += y_abs(step_y);
			renderer.render(stage);
		}
		count--;
		if (count == 0) {
			clearInterval(timer)
		}
	}, 20);
}

function fade(sprite, steps, alpha) {
	if (steps == 0) {
		objectContainer.removeChild(sprite);
		renderer.render(stage);	
		return;
	}
	setTimeout( function() {
		sprite.alpha = alpha;
		sprite.scale.x *= 0.85;
		sprite.scale.y *= 0.85;
		renderer.render(stage);	
		fade(sprite, steps-1, alpha-0.01);		
	}, 50);	
}

function setup_mouse_events(on_move, on_release) {
	objectContainer.mouseup = on_release;
	objectContainer.touchend = on_release;
	objectContainer.mouseupoutside = on_release;
	objectContainer.touchendoutside = on_release;
	objectContainer.mousemove = on_move;
	objectContainer.touchmove = on_move;
}

function align_note_text(entity) {
	if (entity.container.is_open) {
		entity.container.menu.attr('style', 'top:' + y_abs(entity.y) * objectContainer.scale.x +'px; left:' + (x_abs(entity.x) + entity.container.width)  * objectContainer.scale.y + 'px; display: block;');
	} else {
		entity.container.menu.attr('style', 'top:' + y_abs(entity.y) * objectContainer.scale.x +'px; left:' + (x_abs(entity.x) + entity.container.width)  * objectContainer.scale.y + 'px; display: block; visibility: hidden;');
	}

}

//borrowed from http://www.dbp-consulting.com/tutorials/canvas/CanvasArrow.html
var drawHead=function(ctx,x0,y0,x1,y1,x2,y2,style)
{
  'use strict';
  if(typeof(x0)=='string') x0=parseInt(x0);
  if(typeof(y0)=='string') y0=parseInt(y0);
  if(typeof(x1)=='string') x1=parseInt(x1);
  if(typeof(y1)=='string') y1=parseInt(y1);
  if(typeof(x2)=='string') x2=parseInt(x2);
  if(typeof(y2)=='string') y2=parseInt(y2);
  var radius=3;
  var twoPI=2*Math.PI;

  // all cases do this.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0,y0);
  ctx.lineTo(x1,y1);
  ctx.lineTo(x2,y2);
  switch(style){
    case 0:
      // curved filled, add the bottom as an arcTo curve and fill
      var backdist=Math.sqrt(((x2-x0)*(x2-x0))+((y2-y0)*(y2-y0)));
      ctx.arcTo(x1,y1,x0,y0,.55*backdist);
      ctx.fill();
      break;
    case 1:
      // straight filled, add the bottom as a line and fill.
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.lineTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.lineTo(x0,y0);
      ctx.fill();
      break;
    case 2:
      // unfilled head, just stroke.
      ctx.stroke();
      break;
    case 3:
      //filled head, add the bottom as a quadraticCurveTo curve and fill
      var cpx=(x0+x1+x2)/3;
      var cpy=(y0+y1+y2)/3;
      ctx.quadraticCurveTo(cpx,cpy,x0,y0);
      ctx.fill();
      break;
    case 4:
      //filled head, add the bottom as a bezierCurveTo curve and fill
      var cp1x, cp1y, cp2x, cp2y,backdist;
      var shiftamt=5;
      if(x2==x0){
	// Avoid a divide by zero if x2==x0
	backdist=y2-y0;
	cp1x=(x1+x0)/2;
	cp2x=(x1+x0)/2;
	cp1y=y1+backdist/shiftamt;
	cp2y=y1-backdist/shiftamt;
      }else{
	backdist=Math.sqrt(((x2-x0)*(x2-x0))+((y2-y0)*(y2-y0)));
	var xback=(x0+x2)/2;
	var yback=(y0+y2)/2;
	var xmid=(xback+x1)/2;
	var ymid=(yback+y1)/2;

	var m=(y2-y0)/(x2-x0);
	var dx=(backdist/(2*Math.sqrt(m*m+1)))/shiftamt;
	var dy=m*dx;
	cp1x=xmid-dx;
	cp1y=ymid-dy;
	cp2x=xmid+dx;
	cp2y=ymid+dy;
      }

      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,x0,y0);
      ctx.fill();
      break;
  }
  ctx.restore();
};
var drawArrow=function(ctx,x1,y1,x2,y2,style,which,angle,d) {
  'use strict';
  // Ceason pointed to a problem when x1 or y1 were a string, and concatenation
  // would happen instead of addition
  if(typeof(x1)=='string') x1=parseInt(x1);
  if(typeof(y1)=='string') y1=parseInt(y1);
  if(typeof(x2)=='string') x2=parseInt(x2);
  if(typeof(y2)=='string') y2=parseInt(y2);
  style=typeof(style)!='undefined'? style:3;
  which=typeof(which)!='undefined'? which:1; // end point gets arrow
  angle=typeof(angle)!='undefined'? angle:Math.PI/8;
  d    =typeof(d)    !='undefined'? d    :10;
  // default to using drawHead to draw the head, but if the style
  // argument is a function, use it instead
  var toDrawHead=typeof(style)!='function'?drawHead:style;

  // For ends with arrow we actually want to stop before we get to the arrow
  // so that wide lines won't put a flat end on the arrow.
  //
  var dist=Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
  var ratio=(dist-d/3)/dist;
  var tox, toy,fromx,fromy;
  if(which&1){
    tox=Math.round(x1+(x2-x1)*ratio);
    toy=Math.round(y1+(y2-y1)*ratio);
  }else{
    tox=x2;
    toy=y2;
  }
  if(which&2){
    fromx=x1+(x2-x1)*(1-ratio);
    fromy=y1+(y2-y1)*(1-ratio);
  }else{
    fromx=x1;
    fromy=y1;
  }

  // Draw the shaft of the arrow
  // ctx.beginPath();
  // ctx.moveTo(fromx,fromy);
  // ctx.lineTo(tox,toy);
  // ctx.stroke();

  // calculate the angle of the line
  var lineangle=Math.atan2(y2-y1,x2-x1);
  // h is the line length of a side of the arrow head
  var h=Math.abs(d/Math.cos(angle));

  if(which&1){	// handle far end arrow head
    var angle1=lineangle+Math.PI+angle;
    var topx=x2+Math.cos(angle1)*h;
    var topy=y2+Math.sin(angle1)*h;
    var angle2=lineangle+Math.PI-angle;
    var botx=x2+Math.cos(angle2)*h;
    var boty=y2+Math.sin(angle2)*h;
    toDrawHead(ctx,topx,topy,x2,y2,botx,boty,style);
  }
  if(which&2){ // handle near end arrow head
    var angle1=lineangle+angle;
    var topx=x1+Math.cos(angle1)*h;
    var topy=y1+Math.sin(angle1)*h;
    var angle2=lineangle-angle;
    var botx=x1+Math.cos(angle2)*h;
    var boty=y1+Math.sin(angle2)*h;
    toDrawHead(ctx,topx,topy,x1,y1,botx,boty,style);
  }
}

function hexToRGBA(hex, alpha) {
  var r = parseInt( hex.slice(1,3), 16 ),
      g = parseInt( hex.slice(3,5), 16 ),
      b = parseInt( hex.slice(5,7), 16 );
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

function init_canvases(line_thickness, line_color, is_dotted, fill_opacity, fill_color, outline_opacity) {
	var line_color = '#' + ('00000' + (line_color | 0).toString(16)).substr(-6); 

	start_drawing();
	
	draw_context.lineWidth = line_thickness;
	draw_context.strokeStyle = line_color;
	draw_context.fillStyle = line_color;	
	if (is_dotted) {
		if ('setLineDash' in draw_context) {
			draw_context.setLineDash([10, 10]);
		}
	}
	draw_context.beginPath();

	temp_draw_context.lineWidth = line_thickness;
	temp_draw_context.strokeStyle = line_color;
	temp_draw_context.fillStyle = line_color;	
	if (is_dotted) {
		if ('setLineDash' in temp_draw_context) {
			temp_draw_context.setLineDash([10, 10]);
		}
	}
	
	if (fill_opacity) {  // we assume && fill_color && outline_opacity
		var fill_color = '#' + ('00000' + (fill_color | 0).toString(16)).substr(-6); 
		var fill_rgba = hexToRGBA(fill_color, fill_opacity)
		draw_context.fillStyle = fill_rgba;
		temp_draw_context.fillStyle = fill_rgba;	
		var outline_color = '#' + ('00000' + (fill_color | 0).toString(16)).substr(-6); 
		var outline_rgba = hexToRGBA(line_color, outline_opacity)
		draw_context.strokeStyle = outline_rgba;
		temp_draw_context.strokeStyle = outline_rgba;	
	}	
}

function can_edit() {
	return (!is_room_locked || my_user.role);
}

//function fires when mouse is left clicked on the map and it isn't a drag
var last_draw_time;
function on_left_click(e) {
	if (!can_edit()) {
		return;
	}
	if (active_context == 'drag_context') {
		return;
	}
	deselect_all();
	var mouse_location = e.data.getLocalPosition(objectContainer);
	if (active_context == 'draw_context') {
		setup_mouse_events(on_draw_move, on_draw_end);
		new_drawing = {uid : newUid(), type: 'drawing', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, color:draw_color, alpha:1, thickness:parseFloat(draw_thickness), is_arrow:($('#draw_arrow').hasClass('active') || $('#draw_dotted_arrow').hasClass('active')), is_dotted:($('#draw_dotted').hasClass('active') || $('#draw_dotted_arrow').hasClass('active')), path:[[0, 0]]};
		init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.is_dotted);
		draw_context.moveTo(size_x*(new_drawing.x), size_y*(new_drawing.y));
		last_draw_time = Date.now();
	} else if (active_context == 'line_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_line_end);
			new_drawing = {uid : newUid(), type: 'line', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:1, color:line_color, alpha:1, thickness:parseFloat(line_thickness), path:[[0, 0]], is_arrow:($('#arrow').hasClass('active') || $('#dotted_arrow').hasClass('active')), is_dotted:($('#dotted_line').hasClass('active') || $('#dotted_arrow').hasClass('active')) };
			init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.is_dotted);
			draw_context.moveTo(size_x*(new_drawing.x), size_y*(new_drawing.y));
		}
	} else if (active_context == 'polygon_context') {
		if (!new_drawing) {
			setup_mouse_events(on_line_move, on_polygon_end);
			new_drawing = {uid : newUid(), type: 'polygon', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:polygon_outline_thickness, outline_color:polygon_outline_color, outline_opacity: polygon_outline_opacity, fill_color:polygon_fill_color, fill_opacity: polygon_fill_opacity, alpha:1, path:[[0,0]], is_dotted:$('#polygon_dotted').hasClass('active')};

			init_canvases(new_drawing.outline_thickness, new_drawing.outline_color, new_drawing.is_dotted, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(size_x*(new_drawing.x), size_y*(new_drawing.y));
		
			var end_circle_radius = (e.type == "touchstart") ? min_polygon_end_distance_touch : min_polygon_end_distance;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
			graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			
			renderer.render(stage);
		}
	} else if (active_context == 'curve_context') {
		if (!new_drawing) {
			new_drawing = {uid : newUid(), type: 'curve', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y),  scale:1, color:curve_color, alpha:1, thickness:parseFloat(curve_thickness), path:[[0, 0]], is_arrow:($('#curve_arrow').hasClass('active') || $('#curve_dotted_arrow').hasClass('active')), is_dotted:($('#curve_dotted').hasClass('active') || $('#curve_dotted_arrow').hasClass('active')) };

			init_canvases(new_drawing.thickness, new_drawing.color, new_drawing.is_dotted);
			draw_context.moveTo(size_x*(new_drawing.x), size_y*(new_drawing.y));

			setup_mouse_events(on_curve_move, on_curve_end);
			
		}
	} else if (active_context == 'area_context') {
		if (!new_drawing) {
			setup_mouse_events(on_curve_move, on_area_end);
			new_drawing = {uid : newUid(), type: 'area', x:mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y), scale:1, outline_thickness:area_outline_thickness, outline_color:area_outline_color, outline_opacity: area_outline_opacity, fill_color:area_fill_color, fill_opacity: area_fill_opacity, alpha:1, path:[[0, 0]], is_dotted:$('#area_dotted').hasClass('active')};
			
			init_canvases(new_drawing.outline_thickness, new_drawing.outline_color, new_drawing.is_dotted, new_drawing.fill_opacity, new_drawing.fill_color, new_drawing.outline_opacity);
			draw_context.moveTo(size_x*(new_drawing.x), size_y*(new_drawing.y));
		
			var end_circle_radius = (e.type == "touchstart") ? min_polygon_end_distance_touch : min_polygon_end_distance;
			
			graphics = new PIXI.Graphics();
			graphics.lineStyle(new_drawing.outline_thickness * x_abs(thickness_scale), new_drawing.outline_color, new_drawing.outline_opacity);
			graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
			graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
			objectContainer.addChild(graphics);
			
			renderer.render(stage);
		}
	} else if (active_context == 'icon_context') {
		setup_mouse_events(undefined, on_icon_end);
	} else if (active_context == 'ping_context') {
		ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		socket.emit('ping_marker', room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		last_ping_time = new Date();
		setup_mouse_events(on_ping_move, on_ping_end);
	} else if (active_context == "select_context") {
		setup_mouse_events(on_select_move, on_select_end);
		left_click_origin = [mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y)];
		deselect_all();
	} else if (active_context == 'text_context') {
		setup_mouse_events(undefined, on_text_end);
	} else if (active_context == 'background_text_context') {
		setup_mouse_events(undefined, on_background_text_end);
	} else if (active_context == 'rectangle_context') {
		setup_mouse_events(on_rectangle_move, on_rectangle_end);
		left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];		
		init_canvases(rectangle_outline_thickness, rectangle_outline_color, $('#rectangle_dotted').hasClass('active'), rectangle_fill_opacity, rectangle_fill_color, rectangle_outline_opacity);
	} else if (active_context == 'circle_context') {
		setup_mouse_events(on_circle_move, on_circle_end);
		left_click_origin = [mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y)];		
		init_canvases(circle_outline_thickness, circle_outline_color, $('#circle_dotted').hasClass('active'), circle_fill_opacity, circle_fill_color, circle_outline_opacity);
	} else if (active_context == 'track_context') {
		if (my_tracker) {
			stop_tracking();
		} else {
			start_tracking(mouse_location);
			on_track_move(e);
		}
	} else if (active_context == 'note_context') {
		setup_mouse_events(undefined, on_note_end);
	}
}

function stop_tracking() {
	setup_mouse_events(undefined, undefined);
	socket.emit("stop_track", room, my_tracker.uid);
	objectContainer.removeChild(my_tracker.container);
	my_tracker = undefined;
	renderer.render(stage);
}

function start_tracking(mouse_location) {
	setup_mouse_events(on_track_move, undefined);
	var shape = $('#track_shape .active').attr('id');
	var size;
	if (shape == 'circle' || shape == 'cursor') {
		scale = 0.25;
	} else {
		scale = 0.5;
	}
	my_tracker = {uid:newUid(), shape:shape, scale:scale, size_y:size, color: track_color, x: mouse_x_rel(mouse_location.x), y:mouse_y_rel(mouse_location.y)};
	last_track_position = [my_tracker.x, my_tracker.y];
	socket.emit("track", room, my_tracker);
	create_tracker(my_tracker);
}

function on_note_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var note = {uid:newUid(), type: 'note', x:x, y:y, scale:1, color:text_color, alpha:1, text:"", font_size:font_size, font:'Arial'};
	undo_list.push(["add", [note]]);
	create_note(note);
	note.container.is_open = true;
	align_note_text(note);
	snap_and_emit_entity(note);	
}

function create_note(note) {
	var texture = PIXI.Texture.fromImage(image_host+"note.png");
	var sprite = new PIXI.Sprite(texture);

	sprite.height = (sprite.height/29) * y_abs(note_scale) * note.scale;
	sprite.width = (sprite.width/29) * x_abs(note_scale) * note.scale;
	
	//note.container = new PIXI.Container();
	sprite.x = x_abs(note.x);
	sprite.y = y_abs(note.y);

    note.container = sprite;
	note.container.entity = note; 
	note.container.is_open = false;

	note.container.menu = $('<div class="popover fade right in" role="tooltip"><div style="top: 50%;" class="arrow"></div><h3 style="display: none;" class="popover-title"></h3><div class="popover-content"><textarea style="height:400px; width:300px;" id="note_box"></textarea><br /><span id="notification_area" style="float: left;" hidden>Saved</span><div style="float:right;"><button id="save_note">save</button></div></div></div>');
	
	$("#note_box", note.container.menu).val(note.text);
	
	if (is_room_locked && !my_user.role) {
		$('textarea', note.container.menu).prop('readonly', true);
		$('button', note.container.menu).hide();
	}
	
	$("#render_frame").append(note.container.menu);
	$("#save_note", note.container.menu).on('click', function() {
		note.text = $("#note_box", note.container.menu).val();
		$("#notification_area", note.container.menu).show();
		$("#notification_area", note.container.menu).fadeOut("slow");	
		snap_and_emit_entity(note);
	});
	
	align_note_text(note);
		
	make_draggable(note.container);	
	objectContainer.addChild(note.container);
		
	renderer.render(stage);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	room_data.slides[active_slide].entities[note.uid] = note;
}

function create_tracker(tracker) {
	var texture = PIXI.Texture.fromImage(image_host + tracker.shape + '.png');
	tracker.container = new PIXI.Sprite(texture);	
	tracker.container.tint = tracker.color;
	if (tracker.shape != 'cursor') {
		tracker.container.anchor.set(0.5);
	}
	tracker.container.x = x_abs(tracker.x);
	tracker.container.y = y_abs(tracker.y);
	var rel_x = x_rel(tracker.container.width);
	var rel_y = y_rel(tracker.container.height);
	tracker.container.width = x_abs(rel_x * tracker.scale);
	tracker.container.height = y_abs(rel_y * tracker.scale);	
	trackers[tracker.uid] = tracker;
	objectContainer.addChild(trackers[tracker.uid].container);
	renderer.render(stage);
}

function remove_tracker(uid) {
	objectContainer.removeChild(trackers[uid].container);
	renderer.render(stage);
	delete trackers[uid];
}

function ping(x, y, color) {
	var texture = PIXI.Texture.fromImage(image_host + 'circle.png');
	var sprite = new PIXI.Sprite(texture);

	sprite.tint = color;
	sprite.anchor.set(0.5);
	sprite.width = x_abs(0.075);
	sprite.height = x_abs(0.075);
	sprite.alpha = 1;
	sprite.x = x_abs(x);
	sprite.y = y_abs(y);
	
	objectContainer.addChild(sprite);
	sprite.texture.on('update', function() {	
		renderer.render(stage);
	});
	
	fade(sprite, 10, 0.5);
}

var last_track_update = Date.now();
function on_track_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	my_tracker.x = x;
	my_tracker.y = y;
	my_tracker.container.x = x_abs(x);
	my_tracker.container.y = x_abs(y);
	renderer.render(stage);
	
	var dist_sq = (last_track_position[0] - my_tracker.x) * (last_track_position[0] - my_tracker.x)
			     +(last_track_position[1] - my_tracker.y) * (last_track_position[1] - my_tracker.y);
	
	var interval = (Date.now() - last_track_update);

	if (dist_sq > min_track_move_distance_sq || interval > 200) {
		last_track_update = Date.now();
		if (Math.abs(my_tracker.x - last_track_position[0] + my_tracker.y - last_track_position[1]) > 0) {
			socket.emit("track_move", room, my_tracker.uid, my_tracker.x - last_track_position[0], my_tracker.y - last_track_position[1]);
			last_track_position = [my_tracker.x, my_tracker.y];
		}
	}
}

function on_area_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(objectContainer);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(1, x);
		y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
	} catch (e) {}
	
	var distance_to_start_sq = x*x + y*y;

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		setup_mouse_events(undefined, undefined);
		
		new_drawing.path.push([0, 0]);

		draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);		
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);
		
		draw_context.beginPath();
		draw_path2(draw_context, null, new_drawing, new_drawing.path.length, 0, new_drawing.path.length, false, true);
		draw_context.stroke();
		draw_context.fill();
		
		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		renderer.render(stage);
		
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;
	
	} else {
		new_drawing.path.push([x, y]);
		
		if (new_drawing.path.length > 9) {
			var n = 30;
			var start_index = Math.max(new_drawing.path.length-10, 0);
			var stop_index = new_drawing.path.length;
			draw_path2(null, draw_context, new_drawing, 30, start_index, stop_index);
			draw_context.stroke();
		}
		on_curve_move(e);
	}
}

function on_curve_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	new_drawing.path.push([new_x, new_y]);

	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	var n = 30;
	var start_index = Math.max(new_drawing.path.length-10, 0);
	var stop_index = new_drawing.path.length;

	temp_draw_context.beginPath();
	draw_path2(temp_draw_context, null, new_drawing, 30, start_index, stop_index, new_drawing.is_arrow);
	temp_draw_context.stroke();
	
	new_drawing.path.pop();
}

function on_curve_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	x = Math.max(0, x);
	y = Math.max(0, y);
	x = Math.min(1, x);
	y = Math.min(1, y);
	var new_x = x - new_drawing.x;
	var new_y = y - new_drawing.y;
	
	var last_x, last_y;
	if (new_drawing.path.length > 0) {
		last_x = new_drawing.path[new_drawing.path.length-1][0];
		last_y = new_drawing.path[new_drawing.path.length-1][1];
	} else {
		last_x = 0;
		last_y = 0;
	}

	var distance_to_last_sq = (new_x - last_x) * (new_x - last_x) + (new_y - last_y) * (new_y - last_y);
	
	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside" || e.type == "touchstart" || e.type == "touchstartoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_last_sq < (end_circle_radius*end_circle_radius)) {	
		draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
		temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	

		draw_path2(draw_context, null, new_drawing, new_drawing.path.length, 0, new_drawing.path.length, new_drawing.is_arrow);		
		draw_context.stroke();

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		renderer.render(stage);
		
		stop_drawing();
		setup_mouse_events(undefined, undefined);
		new_drawing = null;
	} else {
		new_drawing.path.push([new_x, new_y]);
		objectContainer.removeChild(graphics);
		graphics = new PIXI.Graphics();
		graphics.lineStyle(new_drawing.thickness * x_abs(thickness_scale), new_drawing.color, 1);
		graphics.moveTo(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y));
		graphics.drawShape(new PIXI.Circle(mouse_x_abs(mouse_location.x), mouse_y_abs(mouse_location.y), x_abs(end_circle_radius)));
		objectContainer.addChild(graphics);
		renderer.render(stage);
		
		if (new_drawing.path.length > 9) {
			var n = 30;
			var start_index = Math.max(new_drawing.path.length-10, 0);
			var stop_index = new_drawing.path.length;
			draw_path2(null, draw_context, new_drawing, 30, start_index, stop_index);
			draw_context.stroke();
		}
		on_curve_move(e);
	}
}

function on_line_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(objectContainer);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(1, x);
		y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
		if ((new_drawing.path.length == 0) || x != last(new_drawing.path)[0] || y != last(new_drawing.path)[1]) {
			new_drawing.path.push([x, y]);
		}	
	} catch (e) {}
	var a;
	if (new_drawing.path.length == 1) {
		a = [size_x * (new_drawing.x), size_y * (new_drawing.y)];
	} else {
		a = [size_x * (new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
			 size_y * (new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
	}
	var b = [size_x * (last(new_drawing.path)[0] + new_drawing.x), size_y * (last(new_drawing.path)[1] + new_drawing.y)];
	
	draw_context.lineTo(b[0], b[1]);
	draw_context.stroke();
	
	if (!shifted) {
		if (new_drawing.is_arrow) {
			draw_arrow3(draw_context, a, b, new_drawing);
			draw_context.fill();
		}

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	}
}

function on_polygon_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(objectContainer);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(1, x);
		y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
	} catch (e) {}

	var distance_to_start_sq = x*x + y*y;

	var end_circle_radius = (e.type == "touchend" || e.type == "touchendoutside") ? min_polygon_end_distance_touch : min_polygon_end_distance;
	
	if (distance_to_start_sq < (end_circle_radius*end_circle_radius)) {
		new_drawing.path.push([0, 0]);
		draw_context.lineTo(size_x * new_drawing.x, size_y * new_drawing.y);
		draw_context.stroke();
		draw_context.fill();
		
		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		objectContainer.removeChild(graphics);
		renderer.render(stage);		
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	} else {
		if ((new_drawing.path.length == 0) || x != last(new_drawing.path)[0] || y != last(new_drawing.path)[1]) {
			new_drawing.path.push([x, y]);
		}
		var a;
		if (new_drawing.path.length == 1) {
			a = [size_x * (new_drawing.x), size_y * (new_drawing.y)];
		} else {
			a = [size_x * (new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
				 size_y * (new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
		}
		var b = [size_x * (last(new_drawing.path)[0] + new_drawing.x), size_y * (last(new_drawing.path)[1] + new_drawing.y)];

		draw_context.lineTo(b[0], b[1]);
		draw_context.stroke();
	}
}

function draw_shape(outline_thickness, outline_opacity, outline_color, fill_opacity, fill_color, shape) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(outline_thickness * x_abs(thickness_scale), outline_color, outline_opacity);
	graphic.beginFill(fill_color, fill_opacity);
	graphic.drawShape(shape);
	graphic.endFill();
	return graphic;
}

function on_circle_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	
	var center_x = (left_click_origin[0] + mouse_x_rel(mouse_location.x)) / 2;
	var center_y = (left_click_origin[1] + mouse_y_rel(mouse_location.y)) / 2;
	var radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) + Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
	radius /= 2;
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	temp_draw_context.beginPath();
	temp_draw_context.arc(size_x * center_x, size_y * center_y , Math.sqrt(size_x*size_y) * radius, 0, 2*Math.PI);
	temp_draw_context.fill();
	temp_draw_context.stroke();
}

function on_circle_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	
	var center_x = (left_click_origin[0] + mouse_x_rel(mouse_location.x)) / 2;
	var center_y = (left_click_origin[1] + mouse_y_rel(mouse_location.y)) / 2;
	var radius = Math.sqrt(Math.pow(left_click_origin[0] - mouse_x_rel(mouse_location.x), 2) + Math.pow(left_click_origin[1] - mouse_y_rel(mouse_location.y), 2));
	radius /= 2;
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	temp_draw_context.beginPath();
	temp_draw_context.arc(size_x * center_x, size_y * center_y , Math.sqrt(size_x*size_y) * radius, 0, 2*Math.PI);
	temp_draw_context.fill();
	temp_draw_context.stroke();

	var new_shape = {uid:newUid(), type:'circle', x:center_x, y:center_y, radius:radius, outline_thickness:circle_outline_thickness, outline_color:circle_outline_color, outline_opacity: circle_outline_opacity, fill_opacity: circle_fill_opacity, fill_color:circle_fill_color, alpha:1, is_dotted:$('#circle_dotted').hasClass('active')};

	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(["add", [new_shape]]);
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
}

function on_rectangle_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var left_x = Math.min(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var left_y = Math.min(left_click_origin[1], mouse_y_rel(mouse_location.y));
	var right_x = Math.max(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var right_y = Math.max(left_click_origin[1], mouse_y_rel(mouse_location.y));

	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);							
	temp_draw_context.fillRect(size_x * left_x, size_y * left_y, size_x * (right_x-left_x), size_y *(right_y-left_y)); 
	temp_draw_context.strokeRect(size_x * left_x, size_y *left_y, size_x * (right_x-left_x), size_y *(right_y-left_y));
}

function on_rectangle_end(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var left_x = Math.min(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var left_y = Math.min(left_click_origin[1], mouse_y_rel(mouse_location.y));
	var right_x = Math.max(left_click_origin[0], mouse_x_rel(mouse_location.x));
	var right_y = Math.max(left_click_origin[1], mouse_y_rel(mouse_location.y));
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);							
	temp_draw_context.fillRect(size_x * left_x, size_y * left_y, size_x * (right_x-left_x), size_y *(right_y-left_y)); 
	temp_draw_context.strokeRect(size_x * left_x, size_y *left_y, size_x * (right_x-left_x), size_y *(right_y-left_y));	

	var new_shape = {uid:newUid(), type:'rectangle', x:left_x, y:left_y, width:(right_x - left_x), height:(right_y - left_y), outline_thickness:rectangle_outline_thickness, outline_color:rectangle_outline_color, outline_opacity: rectangle_outline_opacity, fill_opacity: rectangle_fill_opacity, fill_color:rectangle_fill_color, alpha:1, is_dotted:$('#rectangle_dotted').hasClass('active')};
	
	var success = canvas2container(temp_draw_context, temp_draw_canvas, new_shape);
	if (success) {
		emit_entity(new_shape);
		undo_list.push(["add", [new_shape]]);
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
}

function on_ping_move(e) {
	var time = new Date();
	var timeDiff = time - last_ping_time;
	if (timeDiff > 120) {		
		var mouse_location = e.data.getLocalPosition(objectContainer);
		ping(mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		socket.emit('ping_marker', room, mouse_x_rel(mouse_location.x), mouse_y_rel(mouse_location.y), ping_color);
		last_ping_time = time;
	}
}

function on_ping_end(e) {
	setup_mouse_events(undefined, undefined);
}

function on_select_move(e) {
	var mouse_location = e.data.getLocalPosition(objectContainer);
	// draw a rounded rectangle
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(2, 0xBBBBBB, 1);
	graphic.beginFill(0xBBBBBB, 0.25);
	graphic.drawRect(left_click_origin[0], left_click_origin[1], mouse_x_abs(mouse_location.x)-left_click_origin[0], mouse_y_abs(mouse_location.y)-left_click_origin[1]);
	graphic.endFill();
	objectContainer.addChild(graphic);
	renderer.render(stage);
	objectContainer.removeChild(graphic);
}

function on_select_end(e) {
	setup_mouse_events(undefined, undefined);

	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x_min = Math.min(mouse_x_abs(mouse_location.x), left_click_origin[0]);
	var y_min = Math.min(mouse_y_abs(mouse_location.y), left_click_origin[1]);
	var x_max = Math.max(mouse_x_abs(mouse_location.x), left_click_origin[0]);
	var y_max = Math.max(mouse_y_abs(mouse_location.y), left_click_origin[1]);
	
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && room_data.slides[active_slide].entities[key].container) {
			var box = room_data.slides[active_slide].entities[key].container.getBounds();
			if (box.x > x_min && box.y > y_min && box.x + box.width < x_max && box.y + box.height < y_max) {
				selected_entities.push(room_data.slides[active_slide].entities[key]);
			}
		}
	}
	
	select_entities();
	undo_list.push(["select", selected_entities, previously_selected_entities]);
	renderer.render(stage);
}

function brighten(sprite, brightness) {
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		1, 0, 0, brightness, 0,
		0, 1, 0, brightness, 0,
		0, 0, 1, brightness, 0,
		0, 0, 0, 1, 0
	]
	sprite.filters = [filter];
}

function select_entities() {
	var filter = new PIXI.filters.ColorMatrixFilter();
	filter.matrix = [
		1, 0, 0, 0, 0,
		0, 1, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 0.5, 0
	]
	
	for (var i in selected_entities) {
		room_data.slides[active_slide].entities[selected_entities[i].uid].container.filters = [filter];
	}
}

function deselect_all() {
	previously_selected_entities = selected_entities;
	for (var entity in selected_entities) {
		selected_entities[entity].container.filters = undefined;
	}
	selected_entities = [];
}

function draw_path(graphic, path, start_index, stop_index) {
	var path_x = [];
	var path_y = [];
	
	for (var i = 0; i < path.length; i++) {
		path_x.push(x_abs(new_drawing.x + path[i][0]));
		path_y.push(y_abs(new_drawing.y + path[i][1]));
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);		

	if (start_index == 0) {
		graphic.moveTo(path_x[0], path_y[0]);
		graphic.lineTo(path_x[1], path_y[1]);
		start_index	= 1;
	}

	graphic.moveTo(path_x[start_index], path_y[start_index])
	for (var i = start_index; i < stop_index; i++) {
		graphic.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
	}
	
	graphic.graphicsData[graphic.graphicsData.length-1].shape.closed = false;	
}

function draw_path2(context, context2, drawing, n, start_index, stop_index, add_arrow, smooth_out, skip_move) {	
	var i = Math.max(drawing.path.length-n, 0);
	var path = drawing.path.slice(i);
	stop_index -= i;
	start_index -= i;
	
	var path_x = [];
	var path_y = [];
	
	for (var i = 0; i < path.length; i++) {
		path_x.push(size_x * (drawing.x + path[i][0]));
		path_y.push(size_y * (drawing.y + path[i][1]));
	}
	
	//smooth out basically means push some of the end points at the beginning 
	//and some of beginning points at the end before we calculate the control points
	if (smooth_out) {
		var slice_size = Math.min(4, path_x.length-1);
		path_x = path_x.slice(path_x.length-slice_size-1, path_x.length-1).concat(path_x.concat(path_x.slice(1, slice_size+1)))
		path_y = path_y.slice(path_y.length-slice_size-1, path_y.length-1).concat(path_y.concat(path_y.slice(1, slice_size+1)))
		start_index += slice_size;
		stop_index += slice_size;
	}

	var cx = computeControlPoints(path_x);
	var cy = computeControlPoints(path_y);		

	if (add_arrow) {
		if (stop_index - start_index > 2) {
			draw_arrow3(context, [cx.p1[cx.p1.length-1], cy.p1[cy.p1.length-1]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		} else {
			draw_arrow3(context, [path_x[path_x.length-2], path_y[path_y.length-2]], [path_x[path_x.length-1], path_y[path_y.length-1]], drawing);
		}
		context.beginPath();
	}
	
	if (context) {
		if (!skip_move) {
			context.moveTo(path_x[start_index], path_y[start_index]);
		}
		if (context2) {
			context.lineDashOffset = context2.lineDashOffset;
		}
		if (stop_index - start_index == 2) {
			context.lineTo(path_x[1], path_y[1]);
			start_index++;
		}

		var i = start_index;
		for (; i < stop_index-1; i++) {
			context.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
	}

	if (context2) {
		if (path.length == start_index) {
			context2.moveTo(path[0].x, path[0].y);
			context2.lineTo(path[1].x, path[1].y);
		} else if (path.length > start_index) {
			var i = start_index;
			context2.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
	}
}
	
function on_draw_move(e) {
	//limit updates to once ever 10ms
	var time = Date.now();
	var time_diff = time - last_draw_time;
	if (time_diff < 10) return;
	last_draw_time = time;
		
	//only move 0.3 in the direction of the pointer, this smooths it out
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var new_x = mouse_x_rel(mouse_location.x) - new_drawing.x;
	var new_y = mouse_y_rel(mouse_location.y) - new_drawing.y;
	new_x = 0.7 * new_drawing.path[new_drawing.path.length-1][0] + 0.3 * new_x;
	new_y = 0.7 * new_drawing.path[new_drawing.path.length-1][1] + 0.3 * new_y;
	new_drawing.path.push([new_x, new_y]);
	
	//draw_context.lineTo(size_x*(new_x + new_drawing.x), size_y*(new_y + new_drawing.y));
	//draw_context.stroke();
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	
	var n = 30;
	var start_index = Math.max(new_drawing.path.length-10, 0);
	var stop_index = new_drawing.path.length;
	temp_draw_context.beginPath();	
	if (new_drawing.is_arrow) {
		if (new_drawing.path.length > 3) {
			var i = Math.max(0, new_drawing.path.length-3);	
			draw_arrow2(temp_draw_context, new_drawing, 4);
		}
	}
	temp_draw_context.closePath();
	temp_draw_context.beginPath();
	draw_path2(temp_draw_context, draw_context, new_drawing, 30, start_index, stop_index)
	draw_context.stroke();
	temp_draw_context.stroke();	
	
}

function on_draw_end(e) {
	//make sure the last move is recorded
	var mouse_location = e.data.getLocalPosition(objectContainer);
	new_drawing.path.push([mouse_x_rel(mouse_location.x)-new_drawing.x,
						   mouse_y_rel(mouse_location.y)-new_drawing.y]);
		
	var n = 30;
	var start_index = Math.max(new_drawing.path.length-10, 0);
	var stop_index = new_drawing.path.length;
	draw_path2(draw_context, undefined, new_drawing, n, start_index, stop_index, false, false, true);
	draw_context.stroke();
	
	if (new_drawing.is_arrow) {	
		if (new_drawing.path.length > 3) {	
			draw_arrow2(draw_context, new_drawing, 4);
			draw_context.fill();
		}
	}
	
	var success = canvas2container(draw_context, draw_canvas, new_drawing);
	if (success) {
		emit_entity(new_drawing);
		undo_list.push(["add", [new_drawing]]);
	}
		
	stop_drawing();
	setup_mouse_events(undefined, undefined);
	new_drawing = null;
}

function autocrop_canvas(canvas) {
	var ctx = canvas.getContext("2d");
	
	//this code is for clipping
	var w = canvas.width,
	    h = canvas.height,
	    pix = {x:[], y:[]},
	    imageData = ctx.getImageData(0,0,canvas.width,canvas.height),
	    x, y, index;

	for (y = 0; y < h; y++) {
		for (x = 0; x < w; x++) {
			index = (y * w + x) * 4;
			if (imageData.data[index+3] > 0) {
				pix.x.push(x);
				pix.y.push(y);
			}   
		}
	}
	pix.x.sort(function(a,b){return a-b});
	pix.y.sort(function(a,b){return a-b});
	var n = pix.x.length-1;

	x = pix.x[0];
	y = pix.y[0];
	w = pix.x[n] - pix.x[0] + 1;
	h = pix.y[n] - pix.y[0] + 1;
	
	var _canvas = document.createElement("canvas");
	_canvas.width = w;
	_canvas.height = h;
	var _ctx = _canvas.getContext("2d");

	if (pix.x[0] == NaN) {
		return null;
	}
	
	var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);
	_ctx.putImageData(cut, 0, 0);
	
	_canvas.x = x;
	_canvas.y = y;
	return _canvas;
}

function createSprite(ctx, canvas) {
	canvas = autocrop_canvas(canvas);
	//generate the pixi sprite and put it in the right spot
	var texture = PIXI.Texture.fromCanvas(canvas);
	var sprite = new PIXI.Sprite(texture);
	sprite.x = canvas.x;
	sprite.y = canvas.y;
	return sprite;
}

function draw_arrow2(context, drawing, i) {
	var i = Math.max(0, drawing.path.length-i);
	var size = Math.max(Math.min(6*drawing.thickness, 30), 15); //[15 < size < 30]
	var x0 = drawing.path[i][0] - drawing.path[drawing.path.length-1][0];
	var y0 = drawing.path[i][1] - drawing.path[drawing.path.length-1][1];
	l = Math.sqrt(Math.pow(x0,2) + Math.pow(y0,2));
	x0 /= l;
	y0 /= l;
	start_x = size_x * (drawing.path[drawing.path.length-1][0] + drawing.x);
	start_y = size_y * (drawing.path[drawing.path.length-1][1] + drawing.y);
	drawArrow(context, start_x, start_y, start_x-(drawing.thickness*x0),start_y-(drawing.thickness*y0), 3, 1, Math.PI/8, size);	
}

function draw_arrow3(context, a, b, drawing) {
	var size = Math.max(Math.min(6*drawing.thickness, 30), 15); //[15 < size < 30]
	var x_diff = b[0] - a[0];
	var y_diff = b[1] - a[1];
	l = Math.sqrt(Math.pow(x_diff,2) + Math.pow(y_diff,2));
	x_diff /= l;
	y_diff /= l;
	drawArrow(context, b[0], b[1], b[0]+(drawing.thickness*x_diff), b[1]+(drawing.thickness*y_diff), 3, 1, Math.PI/8, size);	
}

function canvas2container(_context, _canvas, entity) {
	var sprite = createSprite(_context, _canvas);	
	if (sprite) {
		entity.container = sprite;		
		//rescale to objectContainer
		sprite.x /= objectContainer.scale.x;
		sprite.y /= objectContainer.scale.y;
		sprite.height /= objectContainer.scale.x;
		sprite.width /= objectContainer.scale.y;
		objectContainer.addChild(sprite);
		
		//make draggable
		sprite.texture.baseTexture.source.src = entity.uid;
		sprite.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);
		make_draggable(sprite);
		sprite.entity = entity;
		
		//send off
		room_data.slides[active_slide].entities[entity.uid] = entity;
		renderer.render(stage);	
		
		return true; //success
	} else {
		return false; //failure
	}
}

function create_line2(line) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	_context.lineWidth = line.thickness;
	_context.strokeStyle = color;
	_context.fillStyle = color;	
	if (line.is_dotted) {
		if ('setLineDash' in _context) {
			_context.setLineDash([10, 10]);
		}
	}
	_context.beginPath();
	_context.moveTo(size_x*(line.x), size_y*(line.y));
	
	for (var i = 0; i < line.path.length; ++i) {
		var x = size_x * (line.path[i][0] + line.x);
		var y = size_y * (line.path[i][1] + line.y);
		_context.lineTo(x,y);
	}
	_context.stroke();

	if (line.is_arrow) {	
		var a;
		if (line.path.length == 1) {
			a = [size_x * (line.x), size_y * (line.y)];
		} else {
			a = [size_x * (line.path[line.path.length-2][0] + line.x),
				 size_y * (line.path[line.path.length-2][1] + line.y)];
		}
		var b = [size_x * (last(line.path)[0] + line.x), size_y * (last(line.path)[1] + line.y)];
		draw_arrow3(_context, a, b, line);
		_context.fill();
	}
	
	canvas2container(_context, _canvas, line);
}

function init_shape_canvas(_context, shape) {
	_context.lineWidth = shape.outline_thickness;
	var fill_color = '#' + ('00000' + (shape.fill_color | 0).toString(16)).substr(-6);
	var stroke_color = '#' + ('00000' + (shape.outline_color | 0).toString(16)).substr(-6); 
	var fill_rgba = hexToRGBA(fill_color, shape.fill_opacity);
	var stroke_rgba = hexToRGBA(stroke_color, shape.outline_opacity);
	_context.fillStyle = fill_rgba;
	_context.strokeStyle = stroke_rgba;	

	if (shape.is_dotted) {
		if ('setLineDash' in _context) {
			_context.setLineDash([10, 10]);
		}
	}
}

function create_rectangle2(rectangle) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	init_shape_canvas(_context, rectangle);

	_context.fillRect(size_x * rectangle.x, size_y * rectangle.y, size_x * (rectangle.width), size_y * (rectangle.height)); 
	_context.strokeRect(size_x * rectangle.x, size_y * rectangle.y, size_x * (rectangle.width), size_y * (rectangle.height));

	canvas2container(_context, _canvas, rectangle);
}

function create_circle2(circle) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	init_shape_canvas(_context, circle);

	_context.beginPath();
	_context.arc(size_x * circle.x, size_y * circle.y , Math.sqrt(size_x*size_y) * circle.radius, 0, 2*Math.PI);
	_context.fill();
	_context.stroke();
	
	canvas2container(_context, _canvas, circle);
}

function create_polygon2(polygon) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	init_shape_canvas(_context, polygon);

	_context.beginPath();
	_context.moveTo(size_x*(polygon.x), size_y*(polygon.y));	
	for (var i = 0; i < polygon.path.length; ++i) {
		var x = size_x * (polygon.path[i][0] + polygon.x);
		var y = size_y * (polygon.path[i][1] + polygon.y);
		_context.lineTo(x,y);
	}
	_context.lineTo(size_x*(polygon.x), size_y*(polygon.y));
	_context.stroke();
	_context.fill();
	
	canvas2container(_context, _canvas, polygon);
}

function create_area2(area) {
	var color = '#' + ('00000' + (line.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	init_shape_canvas(_context, area);

	_context.beginPath();
	draw_path2(_context, null, area, area.path.length, 0, area.path.length, false, true);
	_context.stroke();
	_context.fill();	

	canvas2container(_context, _canvas, area);
}

function create_drawing2(drawing) {
	var color = '#' + ('00000' + (drawing.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	_context.lineWidth = drawing.thickness;
	_context.strokeStyle = color;
	_context.fillStyle = color;	
	if (drawing.is_dotted) {
		if ('setLineDash' in _context) {
			_context.setLineDash([10, 10]);
		}
	}
	_context.beginPath();
	_context.moveTo(size_x*(drawing.x), size_y*(drawing.y));
	var n = drawing.path.length;
	draw_path2(_context, undefined, drawing, n, 0, n);
	_context.stroke();
	if (drawing.is_arrow) {	
		if (drawing.path.length > 3) {	
			draw_arrow2(_context, drawing, 4);
			_context.fill();
		}
	}
	canvas2container(_context, _canvas, drawing);
}

function create_curve2(drawing) {
	var color = '#' + ('00000' + (drawing.color | 0).toString(16)).substr(-6); 
	var _canvas = document.createElement("canvas");
	_canvas.width = size_x;
	_canvas.height = size_y;
	_context = _canvas.getContext("2d");
	_context.lineWidth = drawing.thickness;
	_context.strokeStyle = color;
	_context.fillStyle = color;	
	if (drawing.is_dotted) {
		if ('setLineDash' in _context) {
			_context.setLineDash([10, 10]);
		}
	}
	_context.beginPath();
	_context.moveTo(size_x*(drawing.x), size_y*(drawing.y));
		
	var n = drawing.path.length;
	draw_path2(_context, undefined, drawing, n, 0, n, drawing.is_dotted);
	_context.stroke();
	
	canvas2container(_context, _canvas, drawing);
}

function start_drawing() {
	draw_context.clearRect(0, 0, draw_canvas.width, draw_canvas.height);	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	if ('setLineDash' in temp_draw_context) {
		temp_draw_context.setLineDash([]);
	}
	if ('setLineDash' in draw_context) {
		draw_context.setLineDash([]);
	}
	$(temp_draw_canvas).show();
	$(draw_canvas).show();	
}

function stop_drawing() {
	$(temp_draw_canvas).hide();
	$(draw_canvas).hide();	
}

function snap_and_emit_entity(entity) {
	move_entity(entity, 0, 0);
	renderer.render(stage);
	emit_entity(entity);
	renderer.render(stage);
}

function emit_entity(entity) {
	var container = entity.container;
	entity.container = undefined;
	socket.emit('create_entity', room, entity, active_slide);
	entity.container = container;
}

function on_icon_end(e) {	
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);

	var x = mouse_x_rel(mouse_location.x) - (icon_scale*(icon_size/20)*icon_extra_scale/2);
	var y = mouse_y_rel(mouse_location.y) - (icon_scale*(icon_size/20)*icon_extra_scale/2);
	
	var icon = {uid:newUid(), type: 'icon', tank:selected_icon, x:x, y:y, scale:icon_extra_scale*(icon_size/20), color:icon_color, alpha:1, label:$('#icon_label').val(), label_font_size: label_font_size, label_color: "#ffffff", label_font: "Open Sans", brightness:parseFloat(icon_brightness)}
	undo_list.push(["add", [icon]]);
	create_icon(icon, snap_and_emit_entity);
}

function on_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var text = {uid:newUid(), type: 'text', x:x, y:y, scale:1, color:text_color, alpha:1, text:$('#text_tool_text').val(), font_size:font_size, font:'Open Sans'};
	undo_list.push(["add", [text]]);
	create_text(text);
	snap_and_emit_entity(text);
}

function on_background_text_end(e) {
	setup_mouse_events(undefined, undefined);
	var mouse_location = e.data.getLocalPosition(objectContainer);	
	var x = mouse_x_rel(mouse_location.x);
	var y = mouse_y_rel(mouse_location.y);
	var background_text = {uid:newUid(), type: 'background_text', x:x, y:y, scale:1, color:background_text_color, alpha:1, text:$('#text_tool_background_text').val(), font_size:background_font_size, font:'Open Sans'};
	undo_list.push(["add", [background_text]]);
	create_background_text(background_text);
	snap_and_emit_entity(background_text);
}

function on_line_move(e) {		
	var mouse_location = e.data.getLocalPosition(objectContainer);
	var a;
	if (new_drawing.path.length == 0) {
		a = [size_x * (new_drawing.x), size_y * (new_drawing.y)];
	} else {
		a = [size_x * (new_drawing.path[new_drawing.path.length - 1][0] + new_drawing.x),
			 size_y * (new_drawing.path[new_drawing.path.length - 1][1] + new_drawing.y)];
	}
	var b = [size_x * (mouse_x_rel(mouse_location.x)) , size_y * (mouse_y_rel(mouse_location.y))];
	
	temp_draw_context.clearRect(0, 0, temp_draw_canvas.width, temp_draw_canvas.height);	
	if (new_drawing.is_arrow) {
		draw_arrow3(temp_draw_context, a, b, new_drawing);
	}
	temp_draw_context.beginPath();
	temp_draw_context.moveTo(a[0], a[1]);		
	temp_draw_context.lineTo(b[0], b[1]);
	temp_draw_context.stroke();
}

function on_line_end(e) {
	try {
		var mouse_location = e.data.getLocalPosition(objectContainer);	
		var x = mouse_x_rel(mouse_location.x);
		var y = mouse_y_rel(mouse_location.y);
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(1, x);
		y = Math.min(1, y);
		x -= new_drawing.x;
		y -= new_drawing.y;
		if ((new_drawing.path.length == 0) || x != last(new_drawing.path)[0] || y != last(new_drawing.path)[1]) {
			new_drawing.path.push([x, y]);
		}	
	} catch (e) {}
	var a;
	if (new_drawing.path.length == 1) {
		a = [size_x * (new_drawing.x), size_y * (new_drawing.y)];
	} else {
		a = [size_x * (new_drawing.path[new_drawing.path.length-2][0] + new_drawing.x),
			 size_y * (new_drawing.path[new_drawing.path.length-2][1] + new_drawing.y)];
	}
	var b = [size_x * (last(new_drawing.path)[0] + new_drawing.x), size_y * (last(new_drawing.path)[1] + new_drawing.y)];
	
	draw_context.lineTo(b[0], b[1]);
	draw_context.stroke();
	
	if (!shifted) {
		if (new_drawing.is_arrow) {
			draw_arrow3(draw_context, a, b, new_drawing);
			draw_context.fill();
		}

		var success = canvas2container(draw_context, draw_canvas, new_drawing);
		if (success) {
			emit_entity(new_drawing);
			undo_list.push(["add", [new_drawing]]);
		}
		
		setup_mouse_events(undefined, undefined);
		stop_drawing();
		new_drawing = null;
	}
}

objectContainer.interactive = true;
objectContainer.mousedown = on_left_click;
objectContainer.touchstart = on_left_click;

function create_text(text_entity) {
	var size = "bold "+text_entity.font_size*x_abs(font_scale)+"px " + text_entity.font;
	text_entity.container = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, strokeThickness: (text_entity.font_size/5), stroke: "black", align: "center", dropShadow:true, dropShadowDistance:1});	
	text_entity.container.x = x_abs(text_entity.x);
	text_entity.container.y = y_abs(text_entity.y);
	
	text_entity.container.entity = text_entity;
	text_entity.container.alpha = text_entity.alpha;
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);
	renderer.render(stage);
	
	room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
}

function create_background_text(text_entity) {
	var size = "bold "+text_entity.font_size*x_abs(font_scale)+"px " + text_entity.font;
	var text_ = new PIXI.Text(text_entity.text, {font: size, fill: text_entity.color, align: "center"});
	
	var bounds = text_.getBounds();
	bounds.x -= (text_entity.font_size/2);
	bounds.y -= (text_entity.font_size/2);
	bounds.width += text_entity.font_size;
	bounds.height += text_entity.font_size;
	var shape = new PIXI.RoundedRectangle(bounds.x, bounds.y, bounds.width, bounds.height, 10);
	var graphic = draw_shape(1, 1, 0, 1, 16777215, shape);
	
	var container = new PIXI.Container();
	container.addChild(graphic);
	container.addChild(text_);
	
	container.x = x_abs(text_entity.x);
	container.y = y_abs(text_entity.y);
	
	text_entity.container = container;
	text_entity.container.entity = text_entity;
	text_entity.container.alpha = text_entity.alpha;
	
	make_draggable(text_entity.container);	
	objectContainer.addChild(text_entity.container);
	renderer.render(stage);
	
	room_data.slides[active_slide].entities[text_entity.uid] = text_entity;
}

function create_icon_cont(icon, texture) {
	var sprite = new PIXI.Sprite(texture);
	sprite.tint = icon.color;

	if (icon.brightness) {
		brighten(sprite, icon.brightness);
	}

	var ratio = sprite.width / sprite.height;
	sprite.height = x_abs(icon_scale) * icon.scale;
	sprite.width = sprite.height * ratio;	

	icon.container = new PIXI.Container();
	icon.container.addChild(sprite);
	icon.container.x = x_abs(icon.x);
	icon.container.y = y_abs(icon.y);
	
	if (icon.label && icon.label != "") {
		var size = "bold "+icon.label_font_size*x_abs(font_scale)+"px " + icon.label_font;
		var text = new PIXI.Text(icon.label, {font: size, fill: icon.label_color, align: "center", strokeThickness: (icon.label_font_size/5), stroke: "black", dropShadow:true, dropShadowDistance:1});		
		text.x += sprite.width/2 - text.width/2;
		text.y += sprite.height;
		icon['container'].addChild(text);
	}

	icon.container.entity = icon; 
	icon.container.alpha = icon.alpha;
	
	make_draggable(icon.container);	

	objectContainer.addChild(icon['container']);
	renderer.render(stage);	
	
	room_data.slides[active_slide].entities[icon.uid] = icon;
}
	
function create_icon(icon, cb_after) {
	try {
		var counter = $('#'+icon.tank).find("span");
		counter.text((parseInt(counter.text())+1).toString());		
		counter = $("#icon_counter");
		counter.text((parseInt(counter.text())+1).toString());
	} catch(e) {}
	
	var img = new Image();
	img.crossOrigin = "anonymous";
	img.src = image_host + icon.tank + '.png';	
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	img.onload = function () {
		
	    context.drawImage(this, 0, 0); // put the image in the canvas
	    canvas = autocrop_canvas(canvas);

		var texture = PIXI.Texture.fromCanvas(canvas);
		
		if (texture.baseTexture.hasLoaded) {
			create_icon_cont(icon, texture);
			if (cb_after) cb_after(icon);
		} else {
			texture.baseTexture.on('loaded', function() {
				create_icon_cont(icon, texture);
				if (cb_after) cb_after(icon);
			});
		}
	}
}

function make_draggable(root) {
	root.interactive = true;
    root.buttonMode = true;
	root.mousedown = on_drag_start;
	root.touchstart = on_drag_start;
}

function draw_dotted_line(graphic, x0, y0, x1, y1) {
	var x_diff = x1-x0;
	var y_diff = y1-y0;
	var size = Math.sqrt(x_diff*x_diff+y_diff*y_diff);
	x_diff /= size;
	y_diff /= size;
	var increment = x_abs(0.01);
	for (var i = increment; i < size; i+=increment) {
		graphic.lineTo(x0 + i*x_diff, y0 + i*y_diff);
		i+=increment;
		if (i > size) { //last bit should never be skipped
			break;
		}
		graphic.moveTo(x0 + i*x_diff, y0 + i*y_diff);
	}
	graphic.lineTo(x0 + size*x_diff, y0 + size*y_diff);
	graphic.moveTo(x0 + size*x_diff, y0 + size*y_diff);
}

function draw_arrow(graphic, a, b) {
	var x = (b[0] - a[0]);
	var y = (b[1] - a[1]);
	var angle = 2.75; //in radians, angle between forward facing vector and backward facing arrow head
	var cos_angle = Math.cos(angle);
	var sin_angle = Math.sin(angle);
	var x_1 = x * cos_angle - y * sin_angle;
	var y_1 = x * sin_angle + y * cos_angle;
	var size = Math.sqrt(x_1*x_1 + y_1*y_1);
	x_1 = x_1/size;
	y_1 = y_1/size;
	var x_2 = x * cos_angle + y * sin_angle;
	var y_2 = - x * sin_angle + y * cos_angle;
	size = Math.sqrt(x_2*x_2 + y_2*y_2);
	x_2 = x_2/size;
	y_2 = y_2/size;	
	var scale = x_abs(1.0/35);
	graphic.moveTo(b[0], b[1]);	
	graphic.lineTo(b[0] + x_1 * scale, b[1] + y_1 * scale);
	graphic.moveTo(b[0], b[1]);
	graphic.lineTo(b[0] + x_2 * scale, b[1] + y_2 * scale);	
}

/*computes control points given knots K, this is the brain of the operation*/
function computeControlPoints(K) {
	var p1=new Array();
	var p2=new Array();
	var n = K.length-1;
	
	/*rhs vector*/
	var a=new Array();
	var b=new Array();
	var c=new Array();
	var r=new Array();
	
	/*left most segment*/
	a[0]=0;
	b[0]=2;
	c[0]=1;
	r[0] = K[0]+2*K[1];
	
	/*internal segments*/
	for (var i = 1; i < n - 1; i++)
	{
		a[i]=1;
		b[i]=4;
		c[i]=1;
		r[i] = 4 * K[i] + 2 * K[i+1];
	}
			
	/*right segment*/
	a[n-1]=2;
	b[n-1]=7;
	c[n-1]=0;
	r[n-1] = 8*K[n-1]+K[n];
	
	/*solves Ax=b with the Thomas algorithm (from Wikipedia)*/
	for (var i = 1; i < n; i++)
	{
		var m = a[i]/b[i-1];
		b[i] = b[i] - m * c[i - 1];
		r[i] = r[i] - m*r[i-1];
	}
 
	p1[n-1] = r[n-1]/b[n-1];
	for (var i = n - 2; i >= 0; --i)
		p1[i] = (r[i] - c[i] * p1[i+1]) / b[i];
		
	/*we have p1, now compute p2*/
	for (var i=0;i<n-1;i++)
		p2[i]=2*K[i+1]-p1[i+1];
	
	p2[n-1]=0.5*(K[n]+p1[n-1]);
	
	return {p1:p1, p2:p2};
}

function free_draw(graph, drawing, smooth_out) {
	if (drawing.path.length == 1) {
		var a = [x_abs(drawing.x), y_abs(drawing.y)]
		var b = [x_abs(drawing.x + drawing.path[0][0]), 
		         y_abs(drawing.y + drawing.path[0][1])]
		graph.moveTo(a[0], a[1]);
		graph.lineTo(b[0], b[1]);
		if (drawing.is_arrow) {
			draw_arrow(graph, a, b);
		}
		
	} else {
		var path_x = [x_abs(drawing.x)];
		var path_y = [y_abs(drawing.y)];
		
		for (var i = 0; i < drawing.path.length; i++) {
			path_x.push(x_abs(drawing.x + drawing.path[i][0]));
			path_y.push(y_abs(drawing.y + drawing.path[i][1]));
		}
		
		//smooth out basically means push some of the end points at the beginning 
		//and some of beginning points at the end before we calculate the control points
		var slice_size;
		if (smooth_out) {
			slice_size = Math.min(4, path_x.length-1)
			path_x = path_x.slice(path_x.length-slice_size-1, path_x.length-1).concat(path_x.concat(path_x.slice(1, slice_size+1)))
			path_y = path_y.slice(path_y.length-slice_size-1, path_y.length-1).concat(path_y.concat(path_y.slice(1, slice_size+1)))
		}

		var cx = computeControlPoints(path_x);
		var cy = computeControlPoints(path_y);
		
		if (smooth_out) {
			var left = slice_size;
			var right = path_x.length-slice_size;
			path_x = path_x.slice(left, right)
			path_y = path_y.slice(left, right)
			cx.p1 = cx.p1.slice(left, right)
			cx.p2 = cx.p2.slice(left, right)
			cy.p1 = cy.p1.slice(left, right)
			cy.p2 = cy.p2.slice(left, right)
		}
		
		graph.moveTo(path_x[0], path_y[0]);
		for (var i = 0; i < path_x.length-1; i++) {
			graph.bezierCurveTo(cx.p1[i], cy.p1[i], cx.p2[i], cy.p2[i], path_x[i+1], path_y[i+1]);
		}
		
		if (drawing.is_arrow) {
			if (drawing.type == "drawing") {
				draw_arrow(graph, [path_x[path_x.length-3], path_y[path_y.length-3]], [path_x[path_x.length-1], path_y[path_y.length-1]]);
			} else {
				draw_arrow(graph, [cx.p1[cx.p1.length-1], cy.p1[cy.p1.length-1]], [path_x[path_x.length-1], path_y[path_y.length-1]]);
			}
		}
		
	}
	graph.graphicsData[0].shape.closed = false;
}

function create_drawing(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * x_abs(thickness_scale), drawing.color, 1);
	free_draw(graphic, drawing);		
	graphic.graphicsData[0].shape.closed = false;
	init_graphic(drawing, graphic);
}

function create_area(drawing, smooth_point) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.outline_thickness * x_abs(thickness_scale), drawing.outline_color, 1);
	graphic.beginFill(drawing.fill_color, drawing.fill_opacity);
	free_draw(graphic, drawing, true);
	graphic.graphicsData[0].shape.closed = true;
	graphic.endFill();
	init_graphic(drawing, graphic);
}

function create_rectangle(drawing) {
	var rect = new PIXI.Rectangle(x_abs(drawing.x), y_abs(drawing.y), x_abs(drawing.width), y_abs(drawing.height));
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, rect);
	init_graphic(drawing, graphic);	
}

function create_circle(drawing) {
	var circle = new PIXI.Circle(x_abs(drawing.x), y_abs(drawing.y), x_abs(drawing.radius));
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, circle);
	init_graphic(drawing, graphic);	
}

function create_polygon(drawing) {
	var path = [x_abs(drawing.x), y_abs(drawing.y)];
	for (var i in drawing.path) {
		path.push(x_abs(drawing.path[i][0]+drawing.x));
		path.push(y_abs(drawing.path[i][1]+drawing.y));
	}
	var polygon = new PIXI.Polygon(path);
	var graphic = draw_shape(drawing.outline_thickness, drawing.outline_opacity, drawing.outline_color, drawing.fill_opacity, drawing.fill_color, polygon);
	init_graphic(drawing, graphic);	
}

function create_line(drawing) {
	var graphic = new PIXI.Graphics();
	graphic.lineStyle(drawing.thickness * x_abs(thickness_scale), drawing.color, 1);
	var last_x = x_abs(drawing.x), last_y = y_abs(drawing.y);
	graphic.moveTo(last_x, last_y);
	for (var i = 0; i < drawing.path.length; i++) {
		var x_i = x_abs(drawing.x + drawing.path[i][0]);
		var y_i = y_abs(drawing.y + drawing.path[i][1]);
		if (!drawing.is_dotted) {
			graphic.lineTo(x_i, y_i);
		} else {
			draw_dotted_line(graphic, last_x, last_y, x_i, y_i);
		}
		last_x = x_i;
		last_y = y_i;
	}

	if (drawing.is_arrow) {
		var a;
		if (drawing.path.length == 1) {
			a = [x_abs(drawing.x), y_abs(drawing.y)];
		} else {
			a = [x_abs(drawing.x + drawing.path[drawing.path.length-2][0]), 
			     y_abs(drawing.y + drawing.path[drawing.path.length-2][1])];
		}
		var b = [x_abs(drawing.x + drawing.path[drawing.path.length-1][0]), 
			     y_abs(drawing.y + drawing.path[drawing.path.length-1][1])];
		draw_arrow(graphic, a, b);
	}
	
	graphic.graphicsData[0].shape.closed = false;
	
	init_graphic(drawing, graphic);
}

function init_graphic(drawing, graphic) {
	var texture = graphic.generateTexture();
	var sprite = new PIXI.Sprite(texture);
	var box = graphic.getBounds();
	
	sprite.x = box.x;
	sprite.y = box.y;
	drawing.container = sprite;
	
	drawing.container.alpha = drawing.alpha;

	sprite.texture.baseTexture.source.src = drawing.uid;
	drawing.container.hitArea = new PIXI.TransparencyHitArea.create(sprite, false);

	objectContainer.addChild(drawing.container);
	make_draggable(drawing.container);

	drawing.container.entity = drawing;
	renderer.render(stage);	
	room_data.slides[active_slide].entities[drawing.uid] = drawing;
}

function create_entity(entity) {
	if (room_data.slides[active_slide].entities[entity.uid]) {
		remove(entity.uid);
	}
	if (entity.type == 'background') {
		set_background(entity);
	} else if (entity.type == 'icon') {
		create_icon(entity);
	} else if (entity.type == 'drawing') {
		create_drawing2(entity);
	} else if (entity.type == 'curve') {
		create_curve2(entity);
	} else if (entity.type == 'line') {
		create_line2(entity);
	} else if (entity.type == 'text') {
		create_text(entity);
	} else if (entity.type == 'background_text') {
		create_background_text(entity);
	} else if (entity.type == 'note') {
		create_note(entity);
	} else if (entity.type == 'rectangle') {
		create_rectangle2(entity);
	} else if (entity.type == 'circle') {
		create_circle2(entity);
	} else if (entity.type == 'polygon') {
		create_polygon2(entity);
	} else if (entity.type == 'area') {
		create_area2(entity);
	}
}

function update_username(name) {
	if (name != "" && name != my_user.name) {
		my_user.name = name;
		socket.emit("update_user", room, my_user);
	}
	var input_node = $("#"+my_user.id).find("input");
	input_node.attr('placeholder',my_user.name);
	input_node.val("");
}

function add_user(user) {
	if (my_user_id == user.id) {
		my_user = user;
	}
	if (user.id in userlist) {
		var node = $("#"+user.id);
		if (user.id == my_user_id) {
			node.find('input').attr('placeholder', user.name);
		} else {
			node.text(user.name);
		}
	} else {	
		if (user.id == my_user_id) {
			var node = "<div class='btn' style='text-align:left;' id='" + user.id + "'><input type='text' placeholder='"+ user.name + "'></div>";
			$("#userlist").prepend(node);
			var input_node = $("#userlist").find("input");
			input_node.on('blur', function() {
				update_username(this.value); //update username when field loses focus
			});
			input_node.onkeypress = function(e) {
				if (!e) e = window.event;
					keyCode = e.keyCode || e.which;
					if (keyCode == '13') { //update username when enter is pressed
						update_username(this.value);
					}
			}

		} else { 
			var node = "<button class='btn' style='text-align:left;' data-toggle='tooltip' title='Click to toggle this user&#39;s permission.' id='" + user.id + "'>" + user.name + "</button>";
			$("#userlist").append(node);
		}
	}
	userlist[user.id] = user;
	if (user.role) {
		if (user.role == "owner") {
			$("#"+user.id).css('background-color','lime');
		} else if (user.role == "driver") {
			$("#"+user.id).css('background-color','yellow');
		}
	} else {
		$("#"+user.id).css('background-color','#EEEEEE');
	}
	
	if (user.id == my_user_id) {
		update_my_user();
	}
	$("#user_count").text(Object.keys(userlist).length.toString());
}

//function should be called when anything about you as a user changes, it will update the interface
//accordingly
function update_my_user() {
	if (my_user.logged_in) { //logged in
		$("#save_as").show();
		if (tactic_name && tactic_name != "") {
			$("#save").show();
		}
	} else {
		$("#save_as").hide();
		$("#save").hide();
	}
	update_lock();
}

function update_lock() {
	var node = $('#lock').find('img');
	var path = node.attr('src').substring(0, node.attr('src').lastIndexOf("/"));
	
	if (is_room_locked) {
		node.attr('src', path + "/lock.png");
	} else {
		node.attr('src', path + "/unlock.png");
	}
	
	if (is_room_locked && !my_user.role) {
		$('.left_column').hide();
		$('#slide_tab_button').hide();
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i] && room_data.slides[active_slide].entities[i].type == 'note') {
				if (room_data.slides[active_slide].entities[i].container) {
					$('textarea', room_data.slides[active_slide].entities[i].container.menu).prop('readonly', true);
					$('button', room_data.slides[active_slide].entities[i].container.menu).hide();
				}
			}
		}
	} else {
		$('.left_column').show();
		$('#slide_tab_button').show();
		for (var i in room_data.slides[active_slide].entities) {
			if (room_data.slides[active_slide].entities[i] && room_data.slides[active_slide].entities[i].type == 'note') {
				if (room_data.slides[active_slide].entities[i].container) {
					$('textarea', room_data.slides[active_slide].entities[i].container.menu).prop('readonly', false);
					$('button', room_data.slides[active_slide].entities[i].container.menu).show();
				}
			}
		}
	}
	
	if (my_user.role == "owner") {
		$('#lock').show();
	} else {
		$('#lock').hide();
	}
}

function remove_user(user) {
	$("#"+user).remove();
	delete userlist[user];
	$("#user_count").text(Object.keys(userlist).length.toString());
}

function chat(message, color) {
	message = message.split(":")
	$("#chat_box").append('<div class="chatmsg"><b style="color:' + color + ';">'+message[0]+'</b>: '+ message.slice(1).join(':') +'<br/></div>');
	$("#chat_box").scrollTop($("#chat_box")[0].scrollHeight);
}

function initialize_color_picker(slider_id, variable_name) {
	if (Modernizr.inputtypes.color) {
		$('#' + slider_id + ' ~ input').show();
	} else {
		$('#' + slider_id + ' ~ input').hide();
	}
	
	var color = $('select[id="'+ slider_id + '"]').val();
	window[variable_name] = parseInt('0x'+$('select[id="'+ slider_id + '"]').val().substring(1));
	$('#' + slider_id + ' ~ input').attr('value', color);
	$('#' + slider_id + ' ~ input').val(color);
	
	$('#' + slider_id + ' ~ input').on('change', function() {
		var color = $(this).val();
		window[variable_name] = parseInt('0x'+ color.substring(1));
		$('#' + slider_id + '~ span span[data-selected=""]').removeAttr("data-selected");
	});
	
	$('select[id="'+ slider_id + '"]').simplecolorpicker().on('change', function() {
		var color = $('select[id="'+ slider_id + '"]').val();
		window[variable_name] = parseInt('0x'+ color.substring(1));
		$('#' + slider_id + ' ~ input').val(color);
		
		if (variable_name == 'track_color') { //dirty track color switch hack
			if (my_tracker) {
				stop_tracking();
			}
			start_tracking({x:2000,y:2000});			
		}	
	});
}

function initialize_slider(slider_id, slider_text_id, variable_name) {
	var slider = $("#"+ slider_id).slider({tooltip:'hide'});
	$("#"+slider_text_id).val(slider.attr('value'));
	window[variable_name] = parseFloat(slider.attr('value'));
	slider.on("slide", function(slideEvt) {
		$("#"+slider_text_id).val(slideEvt.value);
		window[variable_name] = parseFloat(slideEvt.value);
	});
	$("#"+slider_text_id).change(function () {
		var new_value = parseFloat(this.value); 
		if (isNaN(new_value)) {
			this.value = window[variable_name]; //restore old value
		} else {
			window[variable_name] = new_value;
			slider.slider('setValue', window[variable_name])
		}
	});
}

//clear entities of a certain type from the map
function clear(type) {
	var cleared_entities = [];
	for (var key in room_data.slides[active_slide].entities) {
		if (room_data.slides[active_slide].entities.hasOwnProperty(key) && (room_data.slides[active_slide].entities[key].type == type || !type) && (room_data.slides[active_slide].entities[key].type != 'background')) {
			var entity = room_data.slides[active_slide].entities[key];
			remove(key);
			cleared_entities.push(entity)
			socket.emit('remove', room, key, active_slide);
		}
	}
	undo_list.push(["remove", cleared_entities]);
}

function undo() {
	var action = undo_list.pop();
	if (action) {
		if (action[0] == "add") {
			for (var i in action[1]) {
				if (action[1][i].uid) {
					remove(action[1][i].uid);
					delete action[1][i].container;
					socket.emit('remove', room, action[1][i].uid, active_slide);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					drag_entity(room_data.slides[active_slide].entities[uid], x, y);
					renderer.render(stage);
					socket.emit('drag', room, uid, active_slide, x, y);
				}
			}
			redo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				delete entity.container;
				socket.emit('create_entity', room, entity, active_slide);
				create_entity(entity);
			}
			redo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[2]) {
				var entity = action[2][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			redo_list.push(action);
			renderer.render(stage);
		}
	}
}

function redo() {
	var action = redo_list.pop();
	if (action) {
		if (action[0] == "add") {
			for (var i in action[1]) {
				if (action[1][i].uid) {
					socket.emit('create_entity', room, action[1][i], active_slide);
					create_entity(action[1][i]);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "drag") {
			for (var i in action[1]) {
				var x = action[1][i][0][0];
				var y = action[1][i][0][1];
				var uid = action[1][i][1].uid;
				if (room_data.slides[active_slide].entities[uid]) { //still exists
					action[1][i][0][0] = room_data.slides[active_slide].entities[uid].x;
					action[1][i][0][1] = room_data.slides[active_slide].entities[uid].y;
					drag_entity(room_data.slides[active_slide].entities[uid], x, y);
					renderer.render(stage);
					socket.emit('drag', room, uid, active_slide, x, y);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "remove") {
			for (var i in action[1]) {
				var entity = action[1][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					remove(entity.uid);
					delete entity.container;
					socket.emit('remove', room, entity.uid, active_slide);
				}
			}
			undo_list.push(action);
		} else if (action[0] == "select") {
			var new_selected_entities = [];
			for (var i in action[1]) {
				var entity = action[1][i];
				if (room_data.slides[active_slide].entities.hasOwnProperty(entity.uid)) {
					new_selected_entities.push(entity);
				}
			}
			
			deselect_all();
			selected_entities = new_selected_entities;
			select_entities();
			undo_list.push(action);
			renderer.render(stage);
		}
	}	
}

function clear_selected() {
	var clone = selected_entities.slice(0);
	var cleared_entities = [];
	for (var i in clone) {
		var entity = clone[i];
		remove(clone[i].uid);
		cleared_entities.push(entity)
		socket.emit('remove', room, entity.uid, active_slide);
	}
	selected_entities = [];
	undo_list.push(["remove", cleared_entities]);
}

function drag_entity(entity, x, y) {
	entity.container.x += x_abs(x-entity.x);
	entity.container.y += y_abs(y-entity.y);
	entity.x = x;
	entity.y = y;
	if (entity.type == 'note') {
		align_note_text(entity);
	}
	renderer.render(stage);	
}

function find_first_slide() {
	var first = Math.pow(2, 52);
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order

		
		if (order < first) {
			first = order;
			uid = key;
		}
	}
	return uid;
}

function find_previous_slide(upper_bound) {
	var largest = -1;
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order
		if ( order < upper_bound && order > largest) {
			largest = order;
			uid = key;
		}
	}
	return uid;
}

function find_next_slide(lower_bound) {
	var smallest = Number.MAX_SAFE_INTEGER;
	var uid = 0;
	for (var key in room_data.slides) {
		var order = room_data.slides[key].order
		if ( order > lower_bound && order < smallest) {
			smallest = order;
			uid = key;
		}
	}
	return uid;
}

function hash(uid) {
	var hash = 0;
	for (var i = 0; i < uid.length; i++) {
		hash += uid.charCodeAt(i);
	}
	return hash;
}

function resolve_order_conflicts(slide) {
	for (var key in room_data.slides) {
		if (room_data.slides[key].order == slide.order) {
			var new_order;
			if (hash(slide.uid) < hash(key)) {
				var prev_slide = find_previous_slide(slide.order);
				var last_order = 0;
				if (prev_slide != 0) {
					last_order = room_data.slides[prev_slide].order;
				}
				slide.order = Math.floor((slide.order - last_order) / 2);
			} else {
				var next_slide = find_next_slide(slide.order);
				var next_order = slide.order + 4294967296;
				if (next_slide != 0) {
					next_order = room_data.slides[next_slide].order;
				}					
				slide.order = Math.floor((next_order - slide.order) / 2);						
			}
			
			resolve_order_conflicts(slide); //we do this again because it might still not be unique
			return;
		}
	}
}

function update_slide_buttons() {
	var prev_slide_uid = find_previous_slide(room_data.slides[active_slide].order);
	var next_slide_uid = find_next_slide(room_data.slides[active_slide].order);
	
	if (prev_slide_uid == 0) {
		document.getElementById("prev_slide").disabled = true;
	} else {
		document.getElementById("prev_slide").disabled = false;
	}
	if (next_slide_uid == 0) {
		document.getElementById("next_slide").disabled = true;
	} else {
		document.getElementById("next_slide").disabled = false;
	}
	if (Object.keys(room_data.slides).length == 1) {
		document.getElementById("remove_slide").disabled = true;
	} else {
		document.getElementById("remove_slide").disabled = false;
	}
	
	if (room_data.slides[active_slide].show_grid) {
		grid_layer.visible = true;
	} else {
		grid_layer.visible = false;
	}
	
	var name = room_data.slides[active_slide].name;
	$('#slide_name_field').val(name);
	$('#slide_select').empty();
		
	var current_slide_uid = find_first_slide();
	do {
		var name = room_data.slides[current_slide_uid].name;
		$('#slide_select').append("<li><a id='" + current_slide_uid + "'>" + name + "</a></li>");
		current_slide_uid = find_next_slide(room_data.slides[current_slide_uid].order);
	} while (current_slide_uid != 0);
}

function transition(slide) {	
	var to_remove = [];
	var to_add = [];
	var to_transition = [];
	 
	for (var key in room_data.slides[active_slide].entities) { 
		if (room_data.slides[slide].entities[key]) {
			to_transition.push(key);
		} else {
			to_remove.push(key);
		}
	}	
	for (var key in room_data.slides[slide].entities) {
		if (!room_data.slides[active_slide].entities.hasOwnProperty(key)) {
			to_add.push(key);
		}
	}
	for (var i in to_remove) {
		var key = to_remove[i];
		remove(key, true);
	}

	for (var i in to_transition) {
		//take over the container
		var key = to_transition[i];
		room_data.slides[slide].entities[key].container = room_data.slides[active_slide].entities[key].container;
		delete room_data.slides[active_slide].entities[key].container;
		if (room_data.slides[slide].entities[key].container) {
			room_data.slides[slide].entities[key].container.entity = room_data.slides[slide].entities[key];
		}

		if (room_data.slides[slide].entities[key].type == "background") {
			to_add.push(key);
		} else {
			room_data.slides[slide].entities[key].container.x += x_abs(room_data.slides[slide].entities[key].x-room_data.slides[active_slide].entities[key].x);
			room_data.slides[slide].entities[key].container.y += y_abs(room_data.slides[slide].entities[key].y-room_data.slides[active_slide].entities[key].y);
			if (room_data.slides[slide].entities[key].type == 'note') {
				align_note_text(room_data.slides[slide].entities[key]);
			}
		}
	}

	active_slide = slide;
		
	for (var i in to_add) {
		var key = to_add[i];
		create_entity(room_data.slides[slide].entities[key]);
	}
		
	renderer.render(stage);
	update_slide_buttons();
}

function change_slide(slide) {
	if (active_slide == slide) {
		return;
	}
	undo_list = [];
	redo_list = [];
	deselect_all();
	transition(slide);	
}

//create a new slide based on slide
function create_new_slide(slide) {	
	var new_slide = {};
	new_slide.show_grid = room_data.slides[slide].show_grid;
	new_slide.uid = newUid();
	
	//generate a new name for the slide
	var new_name = room_data.slides[slide].name;
	var res = new_name.split(' ');
	if (!isNaN(parseFloat(res[res.length-1]))) { //ends with a number
		res[res.length-1] = '' + (parseFloat(res[res.length-1]) + 1);
		new_name = res.join(' ');
	} else {
		new_name = new_name + ' 1';
	}
	new_slide.name = new_name;
	new_slide.entities = {};
	
	for (var key in room_data.slides[slide].entities) {
		var temp = room_data.slides[slide].entities[key].container;
		delete room_data.slides[slide].entities[key].container;
		new_slide.entities[key] = JSON.parse(JSON.stringify(room_data.slides[slide].entities[key]));
		room_data.slides[slide].entities[key].container = temp;
	}
	
	var new_order;
	var next_slide_uid = find_next_slide(room_data.slides[slide].order);
		
	if (next_slide_uid == 0) {
	  new_order = room_data.slides[slide].order + 4294967296;
	} else {
	  new_order = room_data.slides[slide].order + Math.floor((room_data.slides[next_slide_uid].order - room_data.slides[slide].order) / 2);
	  if (new_name == room_data.slides[next_slide_uid].name) {
		  new_slide.name = room_data.slides[slide].name + ' - 1';
	  }
	}

	new_slide.order = new_order;
	return new_slide;
}

function remove_slide(uid) {
	if (Object.keys(room_data.slides).length > 1) {
		if (uid == active_slide) {
			var order = room_data.slides[uid].order;
			var new_slide = find_previous_slide(order);
			if (new_slide == 0) {
				new_slide = find_next_slide(order);
			}
			change_slide(new_slide);
			active_slide = new_slide;
		}
		delete room_data.slides[uid];
	}
	update_slide_buttons();
}

function rename_slide(slide, name) {
	room_data.slides[slide].name = name;
	update_slide_buttons();
}

function add_slide(slide) {
	resolve_order_conflicts(slide);
	room_data.slides[slide.uid] = slide;
	update_slide_buttons();
}

//connect socket.io socket
$(document).ready(function() {
	//sorts maps alphabetically, can't presort cause it depends on language
	var options = $("#map_select option").sort(function(a,b) {
		if ( a.innerHTML < b.innerHTML )
		  return -1;
		if ( a.innerHTML > b.innerHTML )
		  return 1;
		return 0;
	});
	
	$("#map_select").empty().append(options); //ie fix no-op
	
	loader.once('complete', function () {
		$("#map_select").empty();
		$("#map_select").append(options.clone());
		$("#map_select").focus();
		$("#map_select").val("");
	
		$('#draw_context').hide();
		$('#icon_context').hide();
		$('#remove_context').hide();
		$('#text_context').hide();
		$('#line_context').hide();
		$('#rectangle_context').hide();
		$('#circle_context').hide();
		$('#polygon_context').hide();
		$('#curve_context').hide();
		$('#area_context').hide();
		$('#track_context').hide();
		$('#background_text_context').hide();
		$("#save_as").hide();
		$("#save").hide();
		$('#ping').addClass('active');	
		var first_icon = $("#icon_context").find("button:first");
		first_icon.addClass('selected');
		selected_icon = first_icon.attr("id");
		slide_name = $('#slide_name').attr('content');
		
		$('.nav-pills > li > a').click( function() {
			$('.nav-pills > li.active').removeClass('active');
			$(this).parent().addClass('active');
		} );
		
		//color selections
		initialize_color_picker("curve_colorpicker", "curve_color");
		initialize_color_picker("icon_colorpicker", "icon_color");
		initialize_color_picker("draw_colorpicker", "draw_color");
		initialize_color_picker("ping_colorpicker", "ping_color");
		initialize_color_picker("track_colorpicker", "track_color");
		initialize_color_picker("line_colorpicker", "line_color");
		initialize_color_picker("text_colorpicker", "text_color");
		initialize_color_picker("background_text_colorpicker", "background_text_color");
		initialize_color_picker("rectangle_outline_colorpicker", "rectangle_outline_color");
		initialize_color_picker("rectangle_fill_colorpicker", "rectangle_fill_color");
		initialize_color_picker("circle_outline_colorpicker", "circle_outline_color");
		initialize_color_picker("circle_fill_colorpicker", "circle_fill_color");
		initialize_color_picker("polygon_outline_colorpicker", "polygon_outline_color");
		initialize_color_picker("polygon_fill_colorpicker", "polygon_fill_color");
		initialize_color_picker("area_outline_colorpicker", "area_outline_color");
		initialize_color_picker("area_fill_colorpicker", "area_fill_color");
		
		//initialize sliders
		initialize_slider("rectangle_outline_thickness", "rectangle_outline_thickness_text", "rectangle_outline_thickness");
		rectangle_outline_thickness = parseFloat($("#rectangle_outline_thickness").val());
		initialize_slider("rectangle_outline_opacity", "rectangle_outline_opacity_text", "rectangle_outline_opacity");
		initialize_slider("rectangle_fill_opacity", "rectangle_fill_opacity_text", "rectangle_fill_opacity");
		initialize_slider("circle_outline_thickness", "circle_outline_thickness_text", "circle_outline_thickness");
		initialize_slider("circle_outline_opacity", "circle_outline_opacity_text", "circle_outline_opacity");
		initialize_slider("circle_fill_opacity", "circle_fill_opacity_text", "circle_fill_opacity");
		initialize_slider("polygon_outline_thickness", "polygon_outline_thickness_text", "polygon_outline_thickness");
		initialize_slider("polygon_outline_opacity", "polygon_outline_opacity_text", "polygon_outline_opacity");
		initialize_slider("polygon_fill_opacity", "polygon_fill_opacity_text", "polygon_fill_opacity");
		initialize_slider("area_outline_thickness", "area_outline_thickness_text", "area_outline_thickness");
		initialize_slider("area_outline_opacity", "area_outline_opacity_text", "area_outline_opacity");
		initialize_slider("area_fill_opacity", "area_fill_opacity_text", "area_fill_opacity");
		initialize_slider("line_thickness", "line_thickness_text", "line_thickness");
		initialize_slider("draw_thickness", "draw_thickness_text", "draw_thickness");
		initialize_slider("curve_thickness", "curve_thickness_text", "curve_thickness");
		initialize_slider("font_size", "font_size_text", "font_size");
		initialize_slider("background_font_size", "background_font_size_text", "background_font_size");
		initialize_slider("label_font_size", "label_font_size_text", "label_font_size");
		initialize_slider("icon_size", "icon_size_text", "icon_size");
		initialize_slider("icon_brightness", "icon_brightness_text", "icon_brightness");

		$('html').click(function(e) {
			if (e.target.id != 'tactic_name') {
				$('[data-toggle="popover"]').popover('hide');
			}
		});
		
		$('[data-toggle="popover"]').popover({
			container: 'body',
			trigger: 'manual',
			html: 'true',
			template: '<div class="popover popover-medium" style="width: 300px;"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"></div></div></div>',
			content: function() {
				return $('#popover-content');
			}
		}).click(function(e) {
			$(this).popover('toggle');
			document.getElementById("tactic_name").setAttribute("value", tactic_name);
			var popover = $(this);
			$(document).on('click', '#store_tactic', function(e) {
				var name = $(document).find('#tactic_name')[0].value;
				if (name == "") {
					alert("Empty name, tactic not stored");
				} else {
					tactic_name = name;
					socket.emit("store", room, name);
					$("#save").show();
					alert("Tactic stored as: " + name);
					e.stopPropagation();
				}
			});
			e.stopPropagation();
		});
	
		$('#slide_select').on('click', 'a', function() {
			var new_slide = $(this).attr('id');
			if (active_slide == new_slide) {return;}
			socket.emit("change_slide", room, new_slide);
			change_slide(new_slide);
		});
		$('#prev_slide').click(function() {
			var prev_slide_uid = find_previous_slide(room_data.slides[active_slide].order);
			if (prev_slide_uid != 0) {
				socket.emit("change_slide", room, prev_slide_uid);
				change_slide(prev_slide_uid);
			}
		});
		$('#next_slide').click(function() {
			var next_slide_uid = find_next_slide(room_data.slides[active_slide].order);
			if (next_slide_uid != 0) {
				socket.emit("change_slide", room, next_slide_uid);
				change_slide(next_slide_uid);
			}
		});
		$('#new_slide').click(function() {
			var new_slide = create_new_slide(active_slide);
			socket.emit("new_slide", room, new_slide);			
			add_slide(new_slide);
			change_slide(new_slide.uid);
		});
		$('#remove_slide').click(function() { //removed active_slide
			if (Object.keys(room_data.slides).length > 1) {
				socket.emit('remove_slide', room, active_slide);
				remove_slide(active_slide);
			}
		});
		$('#save').click(function() { 
			if (tactic_name && tactic_name != "") {
				socket.emit("store", room, tactic_name);
			}
		});
		$("#slide_name_field").focusout(function() {
			rename_slide(active_slide, $(this).val());
			socket.emit("rename_slide", room, active_slide, $(this).val());
		}); 

		$('#link').click(function() { 
			var copySupported = document.queryCommandSupported('copy');
			var textArea = document.createElement("textarea");
			var link_text = "http://" + location.host + location.pathname+"?room="+room;
			textArea.value = link_text;
			document.body.appendChild(textArea);
			//textArea.select();
			window.prompt("Copy to clipboard and share with friends:", link_text);
			document.body.removeChild(textArea);
		});
		
		$("#chat_input").keyup(function (e) {
			if (e.keyCode == 13) {
				var message = my_user.name + ": " + $("#chat_input").val() + "\n";
				socket.emit("chat", room, message, chat_color);
				chat(message, chat_color);
				$("#chat_input").val("");
			}
		});

		$('#export').click(function () {
			renderer.render(stage);	
			var data;
			if (!is_safari()) {
				data = renderer.view.toDataURL("image/jpeg", 0.9);
			} else {
				var new_renderer = new PIXI.CanvasRenderer(size, size,{backgroundColor : 0xBBBBBB});
				new_renderer.render(stage);			
				data = new_renderer.view.toDataURL("image/jpeg", 0.9);
				new_renderer.destroy();
			}
			
			if (is_ie()) {
				var win=window.open();
				win.document.write("<img src='" + data + "'/>");
			} else {			
				var link = document.createElement("a");
				link.setAttribute("target","_blank");
				if(Blob !== undefined) {
					var blob = new Blob([data], {type: "image/jpeg"});
					link.setAttribute("href", data);
				} else {
					link.setAttribute("href", data);
				}
				link.setAttribute("download", "map.jpg");
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		});
		
		if (is_ie()) {
			$('#backup').hide();
		}
		
		$('#backup').click(function () {
			$.getScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/2.5.0/jszip.min.js", function(){
				var data;
				var original_slide = active_slide;
				var new_renderer = new PIXI.CanvasRenderer(size, size,{backgroundColor : 0xBBBBBB});
				var zip = new JSZip();
				
				var current_slide_uid = find_first_slide();
				do {
					change_slide(current_slide_uid);
					new_renderer.render(stage);
					data = new_renderer.view.toDataURL("image/jpeg", 0.9);
					data = data.replace("data:image/jpeg;base64,","");
					zip.file(room_data.slides[current_slide_uid].name+".jpg", data, {base64:true});
					current_slide_uid = find_next_slide(room_data.slides[current_slide_uid].order);
				} while (current_slide_uid != 0);
				
				var container_backups = {}		
				for (var key in room_data.slides[active_slide].entities) {
					if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
						if (room_data.slides[active_slide].entities[key].container) {
							container_backups[key] = room_data.slides[active_slide].entities[key].container;
							delete room_data.slides[active_slide].entities[key].container
						}
					}
				}	
				zip.file("tactic.json", JSON.stringify(room_data));
				for (var key in room_data.slides[active_slide].entities) {
					if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
						if (container_backups[key]) {
							room_data.slides[active_slide].entities[key].container = container_backups[key];
						}
					}
				}								
				var content = zip.generate();
				var element = document.createElement('a');			
				element.setAttribute('href', "data:application/zip;base64," + content);
				element.setAttribute('download', "backup.zip");
				element.style.display = 'none';
				document.body.appendChild(element);
				element.click();
				document.body.removeChild(element);
				
				change_slide(original_slide);
				
				new_renderer.destroy();

			});
			renderer.render(stage);	
		});

		function extra_icons(link, menu, path, height, scale) {
			$('#' + link).click(function () {
				if (!$.trim($('#' + menu).html())) {
					$.get(image_host + path + "/icon_list.txt", function(data) {
						lines = data.split("\n")
						for (var i in lines) {
							if (lines[i] == "") continue;
							$('#' + menu).append('<img height=' + height + ' class="tank_select" scale="' + scale + '" id="' + path + '/' + lines[i].slice(0, lines[i].length-4) + '" data-toggle="tooltip" title="'+ lines[i] +'" src=' + image_host + path + '/' + lines[i] + '></img>');
						}
					});
				} else {
					$('#' + menu).html("");
				}
			});	
		}
		
		extra_icons("tank_icons", "tank_icon_menu", "wot-icon-set1", 60, 2);
		extra_icons("contour_icons", "contour_icon_menu", "wot-icon-set2", 30, 1);
		
		$('#lock').click(function () {
			var node = $(this).find('img');
			var file = node.attr('src').substring(node.attr('src').lastIndexOf("/")+1);
			if (file == "lock.png") {
				is_room_locked = false;				
			} else {
				is_room_locked = true;
			}
			update_lock();
			socket.emit("lock_room", room, is_room_locked);
		});
		
		$('#grid').click(function () {
			grid_layer.visible = !grid_layer.visible;
			room_data.slides[active_slide].show_grid = grid_layer.visible;
			if (can_edit()) {
				socket.emit("show_grid", room, active_slide, grid_layer.visible);
			}
			renderer.render(stage);
		});

		//tool select
		$('#contexts').on('click', 'button', function (e) {
			stop_drawing();
			setup_mouse_events(undefined, undefined);
			new_drawing = null;
			if (graphics) {
				objectContainer.removeChild(graphics)
			}
			
			if ( $(this).attr('id') == "undo") {
				undo();
				return;
			} else if ( $(this).attr('id') == "redo") {
				redo();
				return;
			} else if ( $(this).attr('id') == "cut") {
				cut();
				return;
			} else if ( $(this).attr('id') == "copy") {
				copy();
				return;
			} else if ( $(this).attr('id') == "paste") {
				paste();
				return;
			}
			
			//dirty trick, if people are still holding shift when changing context, pretend they released it for a sec
			if (shifted && objectContainer.mouseup) { 
				shifted = false;
				objectContainer.mouseup(renderer.plugins.interaction.eventData);
				shifted = true;
			}
			
			$('#contexts').find("button").removeClass('active');
			$(this).addClass('active');			
			var new_context = $(this).attr('id')+"_context";
			if (my_tracker) {
				stop_tracking();
			} 
			if (new_context == "track_context") {
				start_tracking({x:2000,y:2000});
			}			
			if (active_context == new_context) { return; } 	
			if (new_context != "remove_context") {
				deselect_all();
				renderer.render(stage);
			}
			$('#'+active_context).hide();
			$('#'+new_context).show();
			active_context = new_context;

		});	
		
		$('#rectangle_type #rectangle_line').addClass('active');	
		$('#rectangle_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#circle_type #circle_line').addClass('active');	
		$('#circle_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#polygon_type #polygon_line').addClass('active');	
		$('#polygon_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});

		$('#area_type #area_line').addClass('active');	
		$('#area_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		$('#line_type #full_line').addClass('active');	
		$('#line_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});

		$('#curve_type #curve_no_arrow').addClass('active');	
		$('#curve_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});		
		
		$('#track_shape #cursor').addClass('active');
		$('#track_shape').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');		
			if (my_tracker) {
				stop_tracking();
			}
			start_tracking({x:2000,y:2000});	
		});	
		
		$('#draw_no_arrow').addClass('active');
		$('#draw_type').on('click', 'button', function (e) {
			$(this).addClass('active');
			$(this).siblings().removeClass('active');					
		});
		
		
		$('#userlist').on('click', 'button', function () {
			var id = $(this).attr('id');
			if (id == my_user.id) { return; } //you can't change your own permission level
			if (my_user.role != "owner") { return; } //only the owner can change permission level
			if (!userlist[id].role) { //permission toggle
				userlist[id].role = "driver";
				$(this).css('background-color','yellow');
			} else if (userlist[id].role == "driver") {
				userlist[id].role = "owner";
				$(this).css('background-color','lime');
			} else if (userlist[id].role == "owner"){
				delete userlist[id].role;
				$(this).css('background-color','');
			}
			socket.emit("update_user", room, userlist[id]);
			return false;
		});	
		
		$('#clear_all').click(function() {
			clear();
		});
		
		$('#clear_draw').click(function() {
			clear("drawing");
		});
		$('#clear_icons').click(function() {
			clear("icon");
		});
		$('#clear_lines').click(function() {
			clear("line");
		});
		$('#clear_text').click(function() {
			clear("text");
		});
		$('#clear_curve').click(function() {
			clear("curve");
		});
		$('#clear_rectangle').click(function() {
			clear("rectangle");
		});
		$('#clear_circle').click(function() {
			clear("circle");
		});
		$('#clear_polygon').click(function() {
			clear("polygon");
		});
		$('#clear_area').click(function() {
			clear("area");
		});
		$('#clear_selected').click(function() {
			clear_selected();
		});
		$('#clear_note').click(function() {
			clear("note");
		});		

		//tank icon select
		$('#icon_context').on('click', '.tank_select', function() {
			$('#icon_context').find('.selected').removeClass('selected'); // removes the previous selected class
			$(this).addClass('selected'); // adds the class to the clicked image
			selected_icon = $(this).attr('id');
			if ($(this).attr('scale')) {
				icon_extra_scale = parseFloat($(this).attr('scale'));
			} else {
				icon_extra_scale = 1;
			}
		});
		
		$(renderer.view).attr('style', 'z-index: 0; position: absolute;');
		$(".edit_window").append("<div id='render_frame' style='height:" + size_y + "px; width:" + size_x + "px;'></div>");
		$("#render_frame").append(renderer.view);
		$(renderer.view).parent().append(temp_draw_canvas);
		$(renderer.view).parent().append(draw_canvas);
		$(temp_draw_canvas).hide();
		$(draw_canvas).hide();
			
		var map_select_box = document.getElementById("map_select");
		map_select_box.onchange = function() {
			var path = map_select_box.options[map_select_box.selectedIndex].value;
			if (!background || background.path != path) {
				var uid = background ? background.uid : newUid();
				var new_background = {uid:uid, type:'background', path:path};
				socket.emit('create_entity', room, new_background, active_slide);
				set_background(new_background);
			} 
		}
		
		assets_loaded = true;
	});
	
	//network data responses

	room = location.search.split('room=')[1].split("&")[0];		
	socket.on('connect',function() { 
		var timer = setInterval(function() {
			if (assets_loaded) {
				socket.emit('join_room', room, game);
				clearInterval(timer);
			}
		}, 2);	
	});
	
	function cleanup() {
		deselect_all();
		undo_list = [];
		redo_list = [];
		if (active_slide) {
			for (var key in room_data.slides[active_slide].entities) {
				if (room_data.slides[active_slide].entities.hasOwnProperty(key)) {
					var entity = room_data.slides[active_slide].entities[key];
					remove(key);
				}
			}
		}
		room_data = {};
	}
	
	socket.on('room_data', function(new_room_data, my_id, new_tactic_name) {
		cleanup();
		room_data = new_room_data;
		active_slide = room_data.active_slide;
		is_room_locked = room_data.locked;
		my_user_id = my_id;
		tactic_name = new_tactic_name;
		for (var user in room_data.userlist) {
			add_user(room_data.userlist[user]);
		}		
		for (var key in room_data.slides[active_slide].entities) {
			create_entity(room_data.slides[active_slide].entities[key]);
		}
		for (var key in room_data.trackers) {
			create_tracker(room_data.trackers[key]);
		}
		update_slide_buttons();
		update_my_user();
	});

	socket.on('create_entity', function(entity, slide) {
		if (slide != active_slide) {
			room_data.slides[slide].entities[entity.uid] = entity;
		} else {
			create_entity(entity);
		}
	});
	
	socket.on('drag', function(uid, slide, x, y) {
		if (room_data.slides[slide].entities[uid].x == x && room_data.slides[slide].entities[uid].y == y) {
			return; //ignore, it's probably an echo of what I've sent
		}
		if (slide != active_slide) {
			room_data.slides[slide].entities[uid].x = x;
			room_data.slides[slide].entities[uid].y = y;
		} else {
			drag_entity(room_data.slides[active_slide].entities[uid], x, y);
		}
	});

	socket.on('ping_marker', function(x, y, color) {
		ping(x,y,color);
	});

	socket.on('chat', function(message, color) {
		chat(message, color);
	});

	
	socket.on('identify', function(user) {
		if (!my_user) {
			my_user = user;
		} else {
			my_user.logged_in = user.logged_in;
			my_user.name = user.name;
		}
		update_my_user();
	});

	socket.on('remove', function(uid, slide) {
		if (slide != active_slide) {
			delete room_data.slides[slide].entities[uid];
		} else {
			remove(uid);
		}
	});

	socket.on('add_user', function(user) {
		add_user(user);
	});

	socket.on('remove_user', function(user) {
		remove_user(user);
	});

	socket.on('update_user', function(user) {
		update_user(user);
	});

	socket.on('lock_room', function(is_locked) {
		is_room_locked = is_locked;
		update_lock();
	});

	socket.on('change_slide', function(uid) {
		if (uid != active_slide) {
			change_slide(uid);
		}
	});
	
	socket.on('new_slide', function(slide) {
		add_slide(slide);
	});
	
	socket.on('remove_slide', function(slide) {
		if(Object.keys(room_data.slides) <= 1) {
			socket.emit('join_room', room, game);
			return;
		}
		remove_slide(slide);
	});

	socket.on('rename_slide', function(slide, name) {
		rename_slide(slide, name);
	});
	
	socket.on('track', function(tracker) {
		if (!trackers[tracker.uid]) {
			create_tracker(tracker);
		}
	});
	
	socket.on('track_move', function(uid, delta_x, delta_y) {
		move_tracker(uid, delta_x, delta_y)
	});

	socket.on('stop_track', function(uid) {
		remove_tracker(uid)
	});
	
	socket.on('show_grid', function(slide, bool) {
		room_data.slides[slide].show_grid = bool;
		if (slide == active_slide) {
			grid_layer.visible = bool;
			renderer.render(stage);
		}
	});
	
});

setTimeout(function(){ renderer.render(stage); }, 1000);
