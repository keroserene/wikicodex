/*
An experimental knowledge graph visualizer.
@author: serene
@genesis date: 2020.08.27

Depends on the MediaWiki API.
*/

var VERSION = '0.0.1';
var $main = $('.main');
var $canvas = $('#edges');
var context; // for canvas
var $center = null;
var $demoted = null;
var svgroot;
var maindata = {};

// Generalized collections
gLevelOne = {};  // Level one particles - immediately linked with the current center.
universe = {};   // All background particles.

// Origin page IDs.
// var pids = [12765628];

/*
  Based on the mediawiki as of 2020.08.27:
  https://www.mediawiki.org/w/api.php?action=help&modules=query
*/
var API_base = 'https://en.wikipedia.org/w/api.php';
var API_url = API_base + "?origin=*";

var default_params = {
  action: 'query',
  // meta: 'siteinfo',
  // list: "querypage",
  // list: "alllinks, random",
  // qppage: "Uncategorizedpages",
  // qplimit: "10",
  format: 'json',
  exintro: true,
  explaintext: true,
  // list: 'backlinks',
  // params for backlinks:
  // blpageid: pids[0],
  prop: 'info|extracts|pageimages|links|linkshere',
  // prop: 'info|extracts|linkshere',
  piprop: 'thumbnail|original|name',
  inprop: 'url',
  // linkshere: true,
  lhprop: 'pageid|title|redirect',
  lprop: 'pageid|title|redirect',
  lhnamespace: '0',  // Limit to only normal wiki articles.
  lhshow: '!redirect',
  plnamespace: '0',
  iwurl: true,
  lhlimit: 23,
  // pageids: pids,  TO BE FILLED BY CORRESPONDING METHOD.
  indexpageid: true,
};


/* Visual features - for doing some math for radial layouts, etc. */
var CENTER_DIMENSIONS = {
  WIDTH: 0.5,
  HEIGHT: 0.5,
}
var kAnimDelay = 23;
var kMaxParticles = 1000;
var origins = parseDimensions();
var nextId = 0;
var edges = {};  // mapping of "srcid-destid" -> edge object

// Begin main methods.

function fetchPageID(id) {
  let params = JSON.parse(JSON.stringify(default_params));
  var pids = [id];
  params.pageids = pids;
  _fetchQuery(params);
}

function fetchPageByTitle(title) {
  let params = JSON.parse(JSON.stringify(default_params));
  params.titles = [title];
  _fetchQuery(params);
}

function _fetchQuery(params) {
  let url = API_url;
  // Convert params into url query string.
  Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});
  fetch(url)
    .then(function(response) { return response.json(); })
    .then(function(response) {
      // Parsing API response.
      // console.log('API RESPONSE:');
      // console.log(response);
      // console.log(response.query);
      // var alllinks = response.query.alllinks;
      $.each(response.query.pages, function(id, data) {
        parseAPIandUpdate(id, data);
        // console.log(pane);
      });
    })
    .catch(function(error) {
      console.log(error);
    });
}

// General entry point for reception of the MediaWiki API.
// Since some data will require continuations, this will handle the async pulls.
// Updates the interface afterwards, in the most sensible way possible.
function parseAPIandUpdate(id, data) {
  maindata = data;
  generateCenter(data);
  return;
}

/* Parse |data| retrieved from the API and populate the center element. */
function generateCenter(data) {
  // console.log('Page Data for ' + data.pageid);
  // console.log(data);
  let title = data.title;
  let extract = data.extract;
  let fullUrl = data.fullurl || 'unknown';
  function _parseMainImage(data) {
    if (!data.original|| !data.original.source) {
      return '';
    }
    return '<img class="pane-main-image" src="' + data.original.source + '"/>' +
      '<div class="pane-main-image-buffer"></div>';
  }
  function _parseThumbnail(data) {
    if (!data.thumbnail || !data.thumbnail.source) {
      return '';
    }
    return '<img class="thumbnail" src="' + data.thumbnail.source + '"/>';
  }

  // Create or add the center pane to the domtree.
  let htmlGen = '' +
    _parseMainImage(data) +
    '<a class="pane-minimize pane-link" href="#" onclick="demoteCenter()">' +
      '&#x1f5d5; minimize' +
    '</a>' +
    '<a class="pane-full-link pane-link" href="' + fullUrl + '" target="_blank">' +
      '&#x02795; view full page' +
    '</a>' +
    '<div class="pane-content">' +
    '<div class="pane-header">' +
    // _parseThumbnail(data) +
    title +
    '</div>' +
    '<div class="pane-excerpt">' +
      extract +
    '</div>' +
    '</div>';

  // Create center node if necessary.
  if ($center.length <= 0) {
    $center = $('<div class="pane"></div>');
    $center.appendTo($main);
  }

  // Fill out the interface details.
  // Reveal the open level 1 interaction.
  setTimeout(function() {
    $('.level1').removeClass('hidden');
    $center.addClass('center');
  }, 800);


  // Make sure the other irrelevant classes are gone.
  // $center.removeClass('star');
  // $center.html('');
  $center.wData = data;    // Important - must link the new data to the selector.

  // Delay filling out the information.
  setTimeout(function() {
    $center.removeClass('radiation star small placed');
    $center.addClass('center');
    $center.html(htmlGen);
  }, 500);

  // Position the center pane in the right spot.
  origins = parseDimensions();

  // Re-calculate position for the center pane and bring it in the normal spot.
  let pH = CENTER_DIMENSIONS.HEIGHT * origins.height;
  let x = origins.x;
  let y = origins.y1;
  setParticleCoordinates($center, x, y);
}

/* Takes the current center node and removes its details, sending it into the
 * background radiation. */
function demoteCenter() {
  $('.level1').addClass('hidden');
  if (!$center) {
    $demoted = null;
    return;
  }
  maindata.expiry = 5;

  $center.removeClass('center');
  $demoted = $center;
  reduceToLabel($demoted);
  $demoted.addClass('radiation');

  // Push it towards the south to make visual room for the next focus.
  setParticleCoordinates($center, origins.x + (Math.random() * -0.5) * origins.radius, origins.y + origins.radius/2);

  setTimeout(function() {
    if ($demoted == $center) {
      console.log('SOMETHING IS WRONG', $demoted, $center);
    }
    $demoted.addClass('radiation star');
    attachInteraction($demoted);
    beginBrownianMotion($demoted);
  }, 450);
  $center = null;

  radiate();
  return $demoted;
}

function generateNeighbors() {
  if (!maindata || !$center || !maindata.pageid) {
    return;
  }
  $('.level1').addClass('hidden');  // Remove the level 1 button.
  let neighbors = [];
  neighbors = neighbors
    // TODO: Pagination for pages with hundreds of links
    // .concat(maindata.links)
    .concat(maindata.linkshere);
  // Filter out links we don't care about.
  neighbors = neighbors.filter(function(e) {
    return !(e.pageid == maindata.pageid);
  });

  arrangeNeighbors(neighbors);
}

// Take N links and arrange them radially around the central node.
// |links| is expected to be the JSON response from the MediaWiki API within one
// of the data elements of "response.query.pages".
// The nodes can either be created anew, or found among the current universe.
function arrangeNeighbors(links) {
  if (!links) { return; }  // No links...? Seems unlikely for a wiki page.
  origins = parseDimensions();

  let total = links.length;
  // Begins at 180 degrees (0600) but winds back towards 0200 as N -> inf
  let max_spread = 240;
  // let max_spread = 200;
  let root = 60 + (1.0 / total) * (max_spread / 2.0);
  let spread_angle = (180 - root) * 2;
  let spread_increment = spread_angle / total;
  let spread_start = root + spread_increment / 2;

  // Fill basic info and move the neighbor particle to level one.
  $.each(links, function(id, n) {

    // Set position based on angle calculation.
    let angle = spread_start + (spread_increment * id);
    let angleR = angle * Math.PI / 180.0;
    // Bearing of 0-degrees being "North", going clockwise.
    // Bump the radius by a modulus if there's a lot.
    let radius = origins.radius * 1.23;
    if (total > 12) {
      radius += ((origins.radius*0.3) * (id % 3));
    }
    let x = origins.x + Math.sin(angleR) * radius;
    let y = origins.y2 - 30 - Math.cos(angleR) * radius;

    // Generate and radially arrange. If the node already exists in the
    // universe, make use of it.
    // let preexist = universe[n.pageid];
    let $node = generateNeighbor(n);

    let anim_delay = id * kAnimDelay;
    // $n.delay(anim_delay).queue(function() {
    setTimeout(function() {
    // $n.delay(anim_delay).queue(function() {
      setParticleCoordinates($node, x, y);
      $node.addClass('placed');
      attachInteraction($node);
    }, anim_delay);

  });
}

/* Aesthetics - related nodes shall relate radially from the central node, the
 * current page. The nodes shall be evenly distributed among the angle of
 * neighbor, centered south.
 * As the number of nodes increases, the total angle approaches 2:00 and 10:00, like
 * BM.
 */
function _radialPosition(angle) {
}

// Generate or select the DOM element corresponding to the neighbor node,
// and position it in the appropriate spot.
// Sometimes the neighbor node is missing a pageid due to the MediaWiki API's
// inconsistency. In this case, create a temporary id prefixed by 't', and
// update the pageid when it's found.
// function generateNeighbor(data, $node) {
function generateNeighbor(data) {
  // Check if the neighbor is already in the universe, first.
  if (data.pageid in universe) {
    $node = universe[data.pageid];
    $node.wData.expiry = 4;  // Refresh age.
    $node.css('opacity', '');

  } else {
    // Generate new one.
    $node = $('<div class="pane small"></div>');
    setParticleCoordinates($node, origins.x, origins.y);
    $node.appendTo($main);
  }
  stopBrownianMotion($node);  // L1 no longer qualifies as radiation.

  // In any case, now that this node is a neighbor, make sure it's not
  // radiation.
  $node.removeClass('center radiation placed');
  $node.addClass('small');

  // Make sure it only has the basic article title as the label.
  let txt = data.title.replace(' ','<br/>');
  let gen = '<div class="label">' + txt + '</div>';
  $node.html(gen);

  // If this is a new node obtained via adjancy, and does not have a real pageID
  // Set it up with a temporary ID.
  if (!data.pageid) {
    data.pageid = 't' + nextId++;
  }

  $node.wData = data;  // Ensure API data reference is accessible from the node.
  universe[data.pageid] = $node;  // Refresh it's existence in universe.
  gLevelOne[data.pageid] = $node;  // Also put it in LEVEL ONE.

  // By definition, this node must have an edge with the current center.
  // (If there is a center)
  generateEdge($node, $center);
  return $node;
}

function reduceToLabel(node) {
  if (!node || !node.wData) { return; }
  let txt = node.wData.title.replace(' ','<br/>');
  let gen = '<div class="label">' + txt + '</div>';
  node.html(gen);
}

// Helper which just sets the target coordinate (px) of an element.
// The particle will animate there based on CSS.
function setParticleCoordinates(p, x, y) {
  $(p).css('left', x);
  $(p).css('top', y);
}

// Age the current universe, and phase out old particles.
function _ageUniverse() {
  $.each(universe, function(i, node) {
    if (!node) { return; }
    let pid = node.wData.pageid;
    node.wData.expiry--;

    if (node.wData.expiry <= 0) {
      deleteEdge(pid);
      node.remove();
      delete universe[pid];
      return;
    }

    // Fade out nodes based on opacity.
    if (node.wData.expiry < 4) {
      let op = node.wData.expiry / 4.0;
      $(node).css('opacity', op);
    }
  });

}

/*
  Send all L1 particles into background radiation.
*/
function radiate() {
  // Take current 1st level gLevelOne and prepare them as radiation particles.
  // The first time a particle goes into radiation, it must prepare for brownian
  // motion and expiry.
  $.each(gLevelOne, function(i, node) {
    node.removeClass('small placed');
    node.addClass('radiation');

    // All particles have an expiry - they will disappear from DOM and memory if
    // unnecessary.
    if (!node.wData.expiry) {
      node.wData.expiry = 3;
    }

    // Purge from level one because it's no longer necessarily a neighbor.
    delete gLevelOne[node.wData.pageid];
    beginBrownianMotion(node);
  });
  gLevelOne = {}; // Clear first level.
}

function beginBrownianMotion(node) {
  // Iteration of next motion phase.
  let _brownian = function() {
    let x = origins.width * Math.random();
    let y = origins.height * Math.random();
    setParticleCoordinates(node, x, y);
    // node.delay(2500 + Math.random() * 5000).queue(_brownian);
    clearTimeout(node.browniantimer);
    node.browniantimer = setTimeout(_brownian, 2500 + Math.random() * 5000);
  };

  // universe = Object.assign(universe, gLevelOne);

  // Initial timer gets the star moving.
  node.browniantimer = setTimeout(function() {
    node.addClass('star');
    _brownian();
  }, 100);
}

function stopBrownianMotion(node) {
  clearTimeout(node.browniantimer);
}

// Setup click interactions.
// Primary interaction is to focus on the new data node,
// while causing previous neighbor nodes to radiate out into the universe.
function attachInteraction(node) {
  node.unbind();  // Important, to prevent double event handlers.
  node.click(function(e) {
    node.unbind();
    node.wData.expiry = 10;   // Make sure this node doesn't expire anytime soon.
    node.css('opacity', '');  // Remove any opacity modifier for previous fades, if necessary.
    // Remove the intro text if it exists.
    let intro = $('.intro-text');
    if (intro[0]) {
      intro.removeClass('active');
      setTimeout(function() { intro.remove(); }, 500);
    }
    $('.level1').addClass('hidden');
    // Prepare to promote current child to center, and shift it towards the center as well.
    $(this).off('click');
    $pending = $(this);
    delete gLevelOne[node.wData.pageid];
    // setParticleCoordinates($pending, origins.x, origins.y - origins.radius);
    // setParticleCoordinates($pending, origins.x, origins.y);

    // Radiate the current center into the universe.
    demoted = demoteCenter();
    examineNode(node);

    _ageUniverse();

    // Delay the new page examination / load slightly.
    setTimeout(function() {
      $pending.addClass('center');
      $pending.removeClass('small star');
      clearTimeout(node.browniantimer);
    }, 420);
  });
}

/* Refresh screen dimensions, which are necessary for positioning maths.

To get the scaling to work correctly, we have to find the correct origin point
to radiate nodes out of so that they are most likely to remain within the screen
bounds.

There are two "centers". The lower one is for L1 nodes, while the upper one
is for the main panel.
*/
function parseDimensions() {
  px_width  = window.innerWidth;
  px_height = window.innerHeight;
  let minAxis = Math.min(px_width, px_height);
  let radius = minAxis / 2;
  let center_x = px_width / 2;
  let center_y = px_height / 2;
  let center_y1 = center_y - radius * 0.3;
  let center_y2 = center_y;
  // If its vertical orientation (likely mobile) then try to center the nodes
  // At the south, while keeping the orientation pane towards the north.
  if (px_height > px_width) {
    center_y2 = px_height - radius;
    center_y1 = center_y2 / 2.0;
  }
  return {
    x: center_x,
    y: center_y,
    y1: center_y1,
    y2: center_y2,
    radius: radius / 2,
    width: px_width,
    height: px_height,
  };
}

/* Primary function which handles shifting the view to a new node.
returns True or success.
*/
function examineNode($node) {
  let data = $node.wData;
  let id = '' + data.pageid;
  // console.log('Examining...', $node, data);
  delete gLevelOne[id];
  stopBrownianMotion($node);
  $node.addClass('radiation');
  $node.removeClass('small star');

  // New center. Remove other classes and shoot upwards.
  $center = $node;
  // $center.removeClass('star small');
  setParticleCoordinates($center, origins.x, origins.y - origins.radius);

  // This node does not have a pageid yet, so we have to search by Title
  // instead.
  if (id.startsWith('t')) {
    let title = data.title;
    if (!title) {
      return false;
    }
    fetchPageByTitle(data.title);
    return;
  }
  // Default operation uses pageids.
  fetchPageID(id)
  return true;
}

function generateEdge(src, dest) {
  if (!src || !dest) {
    return;
  }
  let key = src.wData.pageid + '-' + dest.wData.pageid;
  // Skip if edge already exists.
  if (edges[key]) {
    return;
  }

  let line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
  let e = {
    svgline: line,
    a: src,
    b: dest,
  };
  edges[key] = e;
  svgroot.appendChild(line);
}

function deleteEdge(srcid) {
  let edge = edges[srcid];
  if (!edge) {
    return;
  }
  if (edge.svgline) {
    _deleteEdge(edge);
  }
  delete edges[srcid];
}

function _deleteEdge(edge) {
  svgroot.removeChild(edge.svgline);
  edge.svgline.remove();
  delete edge.svgline;
}

/* Animation step */
function drawEdges() {
  $.each(edges, function(id, edge) {
    // Get position of src and dest
    let src = edge.a;
    let dest = edge.b;
    line = edge.svgline;

    // Delete edges if either node is gone.
    // Deletion when the destination node is missing.
    // When the src node is missing, the edge disappears automatically due to
    // the index.
    if (!src || !src[0] || src.wData.expiry <= 0 ||
        !dest || !dest[0] || dest.wData.expiry <= 0) {
      // TODO: Upgrade the edge rendering to show bidirectionality.
      // _deleteEdge(edge);
      line.setAttributeNS(null, 'stroke-width', 0);

    } else {
      let srcBound = src[0].getBoundingClientRect();
      let destBound = dest[0].getBoundingClientRect();
      let x1 = srcBound.x + srcBound.width/2;
      let y1 = srcBound.y + srcBound.height/2;
      let x2 = destBound.x + destBound.width/2;
      let y2 = destBound.y + destBound.height/2;
      line.setAttributeNS(null, 'x1', x1);
      line.setAttributeNS(null, 'y1', y1);
      line.setAttributeNS(null, 'x2', x2);
      line.setAttributeNS(null, 'y2', y2);
    }
  });
  window.requestAnimationFrame(drawEdges);
}

$(document).ready(function() {
  // ORiginal page:
  // let first = 27667;
  let spacetime = 28758;
  // let boganyi = 12765628;
  let intro = $('.intro-text');
  $(this).delay(100).queue(function() {
    // fetchPageID(spacetime);
    intro.addClass('active');
  });

  // Hard-coded initial options.
  let initLinks = [
    { pageid: 18839,      title: 'Music', },
    { pageid: 752,        title: 'Art', },
    { pageid: 2130,       title: 'Aesthetics', },
    { pageid: 13692155,   title: 'Philosophy', },
    { pageid: 18831,      title: 'Math' },
    { pageid: 26700,      title: 'Science', },
    { pageid: 22939,      title: 'Physics', },
    { pageid: 28758,      title: 'Spacetime' },
    // { pageid: 26700,      title: 'Science', }
  ];
  arrangeNeighbors(initLinks);

  // Populate with a variety of topics

  $center = $('.pane.center');
  svgroot = document.getElementById('edges');
  window.requestAnimationFrame(drawEdges);

});

function toggleHelp() {
  $('.helptext').toggleClass('active');
}

// document.keypress(function(e) {
document.onkeydown = (function(e) {
  if ('Escape' === e.key) {
    if ($('.helptext').hasClass('active')) {
      $('.helptext').removeClass('active');
      return;
    }
    demoteCenter();
  }
  // Shortcut for expand full page.
  if ('o' === e.key || 'Enter' === e.key) {
    $('.pane-full-link')[0].click();
  }
  // Shortcut for neighbors
  if (' ' === e.key || 'n' === e.key) {
    generateNeighbors();
  }
  if ('?' == e.key || 'h' == e.key) {
    toggleHelp();
  }
});
