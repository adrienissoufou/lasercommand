/*
 * Laser Command - A typing game
 * Copyright (C) 2017  Neil Roberts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var SVG_NS = "http://www.w3.org/2000/svg";

var inflight_words = [];
var laser_beams = [];
var words_elem;
var word_input;
var frame_queued = false;
var start_time;

var GAME_WIDTH = 800;
var WORD_X_START_BORDER = 100;
var WORD_Y_START = -10;
var WORD_Y_END = 575;
var LASER_Y = 525;
var LASER_TIME = 250.0;

var CITY_POSITIONS = [
  150, 200, 250,
  550, 600, 650
];

var LASER_POSITIONS = [
  50, 400, 750
];

var cities_alive;
var started = false;

function remove_at(ary, i)
{
  /* Move the last element over the top of this one */
  if (i < ary.length - 1)
    ary[i] = ary[ary.length - 1];

  ary.pop();
}

function destroy_word_at(i)
{
  words_elem.removeChild(inflight_words[i].elem);
  remove_at(inflight_words, i);
}

function destroy_city(city_num)
{
  cities_alive[city_num] = false;
  var elem = document.getElementById("city" + (city_num + 1));
  elem.setAttribute("visibility", "hidden");
}

function frame_cb()
{
  frame_queued = false;

  var now = performance.now();

  for (var i = 0; i < inflight_words.length;) {
    var w = inflight_words[i];
    var d = (now - w.start_time) / w.duration / 1000.0;

    if (d >= 1.0) {
      destroy_word_at(i);

      if (cities_alive[w.target_city])
        destroy_city(w.target_city);
    } else {
      var end_x = CITY_POSITIONS[w.target_city];
      w.elem.setAttribute("x", d * (end_x - w.start_x) + w.start_x);
      w.elem.setAttribute("y", d * (WORD_Y_END - WORD_Y_START) + WORD_Y_START);

      i++;
    }
  }

  for (var i = 0; i < laser_beams.length;) {
    var b = laser_beams[i];

    var d = now - b.start_time;

    if (d >= LASER_TIME) {
      words_elem.removeChild(b.elem);
      remove_at(laser_beams, i);
    } else {
      b.elem.setAttribute("opacity", Math.cos(d * Math.PI / LASER_TIME));
      i++;
    }
  }

  if (inflight_words.length > 0 || laser_beams.length > 0)
    queue_frame();
}

function queue_frame()
{
  if (frame_queued)
    return;

  frame_queued = true;

  requestAnimationFrame(frame_cb);
}

function get_word()
{
  var score = Math.random();
  var min = 0, max = Math.floor(words.length / 2);

  while (max > min) {
    var mid = Math.floor((min + max) / 2);
    var comp = words[mid * 2 + 1];
    if (score < comp)
      max = mid;
    else
      min = mid + 1;
  }

  return words[min * 2];
}

function add_inflight_word()
{
  var word = get_word();

  var elem = document.createElementNS(SVG_NS, "text");
  elem.setAttribute("class", "inflight_word");

  elem.appendChild(document.createTextNode(word));

  words_elem.appendChild(elem);

  var w = {
    word: word,
    elem: elem,
    start_x: (Math.random() * (GAME_WIDTH - WORD_X_START_BORDER * 2.0) +
              WORD_X_START_BORDER),
    target_city: Math.floor(Math.random() * CITY_POSITIONS.length),
    start_time: performance.now(),
    duration: (Math.random() * 3.0 + 1.0) * Math.pow(1.1, word.length - 1),
    highlighted: 0,
  };

  inflight_words.push(w);

  queue_frame();

  var next_time = Math.random() * 4000.0 + 1000.0;
  /* Speed up the word rate over time */
  var elapsed = performance.now() - start_time;
  next_time /= Math.pow(1.01, elapsed / 1000.0);

  setTimeout(add_inflight_word, next_time);
}

function mousedown_cb(event)
{
  document.getElementById("inputbox").focus();
  event.preventDefault();

  if (!started) {
    start_time = performance.now();
    add_inflight_word();
    started = true;
    document.getElementById("intro").setAttribute("visibility", "hidden");
  }
}

function calculate_highlight(value, word)
{
  var start = value.length;

  if (start > word.length)
    start = word.length;

  for (; start >= 1; start--) {
    if (word.startsWith(value.substring(value.length - start)))
      return start;
  }

  return 0;
}

function set_highlight(w, highlight)
{
  if (highlight == w.highlighted)
    return;

  while (w.elem.lastChild)
    w.elem.removeChild(w.elem.lastChild);

  if (highlight == 0) {
    w.elem.appendChild(document.createTextNode(w.word));
  } else {
    var tspan = document.createElementNS(SVG_NS, "tspan");
    tspan.setAttribute("class", "highlighted");
    tspan.appendChild(document.createTextNode(w.word.substring(0, highlight)));
    w.elem.appendChild(tspan);

    if (highlight < w.word.length) {
      tspan = document.createElementNS(SVG_NS, "tspan");
      tspan.appendChild(document.createTextNode(w.word.substring(highlight)));
      w.elem.appendChild(tspan);
    }
  }

  w.highlighted = highlight;
}

function add_laser_beam(tx, ty)
{
  var elem = document.createElementNS(SVG_NS, "path");
  elem.setAttribute("class", "laser-beam");
  var laser = Math.floor(Math.random() * LASER_POSITIONS.length);
  elem.setAttribute("d",
                    "M " + LASER_POSITIONS[laser] + "," + LASER_Y + " " +
                    "L " + tx + "," + ty);
  words_elem.appendChild(elem);
  var beam = { elem: elem, start_time: performance.now() };
  laser_beams.push(beam);
  queue_frame();
}

function input_cb()
{
  var value = word_input.value;
  var killed_word = false;

  for (var i = 0; i < inflight_words.length;) {
    var w = inflight_words[i];
    var highlight = calculate_highlight(value, w.word);

    if (highlight >= w.word.length) {
      add_laser_beam(w.elem.getAttribute("x"),
                     w.elem.getAttribute("y"));
      destroy_word_at(i);
      killed_word = true;
    } else {
      set_highlight(w, highlight);
      i++;
    }
  }

  if (killed_word) {
    word_input.value = "";
    for (var i = 0; i < inflight_words.length; i++)
      set_highlight(inflight_words[i], 0);
  }
}

function initialise()
{
  cities_alive = new Array(CITY_POSITIONS.length);
  for (var i = 0; i < cities_alive.length; i++)
    cities_alive[i] = true;

  word_input = document.getElementById("inputbox");
  words_elem = document.getElementById("words");
  var game_area = document.getElementById("game-area");
  game_area.addEventListener("mousedown", mousedown_cb);
  word_input.addEventListener("input", input_cb);
}

window.onload = initialise;
