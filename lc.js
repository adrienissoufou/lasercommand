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
var words_elem;
var frame_queued = false;

var GAME_WIDTH = 800;
var WORD_X_START_BORDER = 100;
var WORD_Y_START = -10;
var WORD_Y_END = 575;

function frame_cb()
{
  frame_queued = false;

  var now = performance.now();

  for (var i = 0; i < inflight_words.length;) {
    var w = inflight_words[i];
    var d = (now - w.start_time) / w.duration / 1000.0;

    if (d >= 1.0) {
      if (i < inflight_words.length - 1)
        inflight_words[i] = inflight_words[inflight_words.length - 1];
      inflight_words.pop();
      words_elem.removeChild(w.elem);
    } else {
      w.elem.setAttribute("x", d * (w.end_x - w.start_x) + w.start_x);
      w.elem.setAttribute("y", d * (WORD_Y_END - WORD_Y_START) + WORD_Y_START);

      i++;
    }
  }

  if (inflight_words.length > 0)
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
    end_x: (Math.random() * (GAME_WIDTH - WORD_X_START_BORDER * 2.0) +
            WORD_X_START_BORDER),
    start_time: performance.now(),
    duration: Math.random() * 3.0 + 1.0,
  };

  inflight_words.push(w);

  queue_frame();

  setTimeout(add_inflight_word, Math.random() * 4000.0 + 1000.0);
}

function initialise()
{
  words_elem = document.getElementById("words");
  add_inflight_word();
}

window.onload = initialise;
