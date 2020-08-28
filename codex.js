/*
An experimental knowledge graph visualizer.
@author: serene
@genesis date: 2020.08.27

Depends on the MediaWiki API.
*/

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
// Constant dimensions (%) for the center pane.
var CENTER_DIMENSIONS = {
  WIDTH: 0.5,
  HEIGHT: 0.5,
}
var kAnimDelay = 23;
var kMaxParticles = 1000;

var origins = parseDimensions();
var nextId = 0;
var edges = {};  // src node id -> edge object
var edgeMappings = {};
  // el -> el
// };

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
  // prop: 'info',
  // linkshere: true,
  lhprop: 'pageid|title|redirect',
  lprop: 'pageid|title|redirect',
  lhnamespace: '0',  // Limit to only normal articles.
  lnshow: '!redirect',
  plnamespace: '0',
  iwurl: true,
  lhlimit: 23,
  // iwlinks: true,
  // pageids: pids,  TO BE FILLED
  indexpageid: true,
};

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

  // Parse neighbor nodes and have basic info ready.
  // TODO: make it do backlinks and forward links
  arrangeNeighbors(neighbors);
}

/* Parse |data| retrieved from the API and populate the center element. */
function generateCenter(data) {
  console.log('Page Data for ' + data.pageid);
  console.log(data);

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
  // $center = $('.pane.center');
  let htmlGen = '' +
    _parseMainImage(data) +
    '<a class="pane-minimize pane-link" href="#" onclick="demoteCenter()">' +
      '&#x02795; minimize' +
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
    '</div>'+
    '<a class="level1" href="#" onclick="generateNeighbors()">&#9096;</a>';

  // Create center node if necessary.
  if ($center.length <= 0) {
    $center = $('<div class="pane"></div>');
    $center.appendTo($main);
  }

  // Fill out the interface details.
  $center.html(htmlGen);
  setTimeout(function() {
    $center.addClass('center');
  }, 10);

  // Make sure the other irrelevant classes are gone.
  $center.removeClass('radiation star small placed');
  $center.data = data;    // Important - must link the new data to the selector.

  // Position the center pane in the right spot.
  origins = parseDimensions();

  // Re-calculate position for the center pane and bring it in the normal spot.
  let pH = CENTER_DIMENSIONS.HEIGHT * origins.height;
  let x = origins.x; // - pW/2;
  let y = origins.y - origins.radius/2;
  setParticleCoordinates($center, x, y);
}

/* Takes the current center node and removes its details, sending it into the
 * background radiation. */
function demoteCenter() {
  if (!$center) {
    $demoted = null;
    return;
  }
  maindata.expiry = 5;

  $center.removeClass('center');
  $demoted = $center;
  // $demoted.removeClass('small');
  reduceToLabel($demoted)
  $demoted.addClass('radiation');
  setParticleCoordinates($center, origins.x + (Math.random() * -0.5) * origins.radius, origins.y + origins.radius/2);

  setTimeout(function() {
    if ($demoted == $center) {
      console.log('SOMETHING IS WRONG', $demoted, $center);
    }
    $demoted.addClass('radiation star');
    attachInteraction($demoted);
    beginBrownianMotion($demoted);
  // setParticleCoordinates($demoted, origins.x, origins.y + origins.radius*0.3);
  }, 450);

  $center = null;
  return $demoted;
}


function generateNeighbors() {
  // links = maindata.links;
  // Remove the level 1 button.
  $('.level1').remove();

  // Figure out all the neighbors for the first level,
  // and filter out links we don't care about.
  let neighbors = [];
  neighbors = neighbors
    // .concat(data.links)
    .concat(maindata.linkshere);
  neighbors = neighbors.filter(function(e) {
    // return !(e.redirect !== undefined) &&
    return !(e.pageid == maindata.pageid);
  });

  arrangeNeighbors(neighbors);
}

// Take N links and arrange them radially around the central node.
// |links| is expected to be the JSON response from the MediaWiki API within one
// of the data elements of "response.query.pages".
// The nodes can either be created anew, or found among the current universe.
function arrangeNeighbors(links) {
  if (!links) {
    console.log('No gLevelOne qualified links.');
    return;
  }
  // console.log('ARRANGE NEIGHBORS', links);
  origins = parseDimensions();

  let total = links.length;
  // Begins at 180 degrees (0600) but winds back towards 0200 as N -> inf
  let max_spread = 240;
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
    // Bump the radius if there's a lot.
    let radius = origins.radius;
    if (total > 12) {
      radius += (120 * (id % 3));
    }
    let x = origins.x + Math.sin(angleR) * radius;
    let y = origins.y - 30 - Math.cos(angleR) * radius;

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

  } else {
    // Generate new one.
    $node = $('<div class="pane small"></div>');
    setParticleCoordinates($node, origins.x, origins.y);
    $node.appendTo($main);
  }

  stopBrownianMotion($node);

  // In any case, now that this node is a neighbor, make sure it's not
  // radiation.
  $node.removeClass('center radiation placed');
  $node.addClass('small');

  // clearTimeout($node.data.browniantimer);  // If it comes from universe.
  // delete $node.data.browniantimer;
  // console.log('clear', $node);
  // delete universe[data.pageid];     // Remove from the universe set so it
                                    // doesn't get subject to brownian motion.

  // Make sure it only has the basic article title as the label.
  let txt = data.title.replace(' ','<br/>');
  let gen = '<div class="label">' + txt + '</div>';
  $node.html(gen);

  // If this is a new node obtained via adjancy, and does not have a real pageID
  // Set it up with a temporary ID.
  if (!data.pageid) {
    // console.log('Missing pageid.');
    data.pageid = 't' + nextId++;
  }

  $node.data = data;  // Ensure API data reference is accessible from the node.
  universe[data.pageid] = $node;  // Refresh it's existence in universe.
  gLevelOne[data.pageid] = $node;  // Also put it in LEVEL ONE.

  // By definition, this node must have an edge with the current center.
  generateEdge($node, $center);
  return $node;
}

function reduceToLabel(node) {
  let txt = node.data.title.replace(' ','<br/>');
  let gen = '<div class="label">' + txt + '</div>';
  node.html(gen);
}

// Helper which just sets the target coordinate (px) of an element.
// The particle will animate there based on CSS.
function setParticleCoordinates(p, x, y) {
  $(p).css('left', x);
  $(p).css('top', y);
}

function _ageUniverse() {
  // Age the current universe, and phase out old particles.
  $.each(universe, function(i, n) {
    if (!n) { return; }
    let pid = n.data.pageid;
    n.data.expiry--;
    if (n.expiry <= 0) {
      console.log('Node expired.', n);
      deleteEdge(pid);
      n.remove();
      delete universe[pid];
    }
  });

}

/*
  Send all level / neighbor particles into background radiation.
*/
function radiate(target) {
  _ageUniverse();

  // Take current 1st level gLevelOne and prepare them as radiation particles.
  // The first time a particle goes into radiation, it must prepare for brownian
  // motion and expiry.
  $.each(gLevelOne, function(i, node) {
    // if (!n) { return; } this should never happen
    // let $n = $(n);
    node.removeClass('small placed');
    node.addClass('radiation');
    // Randomize particle location.
    // let r = Math.random() * origins.radius * 1.8;
    // let a = Math.random() * 2 * Math.PI;
    // let x = origins.x + Math.sin(a) * r;
    // let y = origins.y - Math.cos(a) * r;
    // setParticleCoordinates(n, x, y);
    // All particles have an expiry - they will disappear from DOM and memory if
    // unnecessary.
    if (!node.data.expiry) {
      node.data.expiry = 3;
    }

  // Begin brownian motion only for the stars.
  // $.each(universe, function(i, node) {
    // if (!(node.data.pageid in gLevelOne)) {
      // beginBrownianMotion(node);
    // }
  // });
    // Create an edge from each element to the radiation target.

    // console.log(universe[n.data.pageid]);
    // Purge from level one because it's no longer necessarily a neighbor.
    delete gLevelOne[node.data.pageid];
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
    clearTimeout(node.data.browniantimer);
    node.data.browniantimer = setTimeout(_brownian, 2500 + Math.random() * 5000);
  };

  // universe = Object.assign(universe, gLevelOne);

  // Initial timer gets the star moving.
  node.data.browniantimer = setTimeout(function() {
    node.addClass('star');
    _brownian();
  }, 100);
}

function stopBrownianMotion(node) {
  clearTimeout(node.data.browniantimer);
}

// Setup click interactions.
// Primary interaction is to focus on the new data node,
// while causing previous neighbor nodes to radiate out into the universe.
function attachInteraction($n) {
  $n.unbind();  // Important, to prevent double event handlers.
  $n.click(function(e) {
    $n.unbind();
    console.log('CLICKED NEIGHBOR', $n);
    // Prepare to promote current child to center, and shift it towards the center as well.
    $(this).off('click');
    $pending = $(this);
    delete gLevelOne[$n.data.pageid];
    // setParticleCoordinates($pending, origins.x, origins.y - origins.radius);
    // setParticleCoordinates($pending, origins.x, origins.y);

    // Radiate the current center into the universe.
    demoted = demoteCenter();
    radiate(demoted);

    examineNode($n);
    // All other nodes except the center. The center must be treated specially.

    // Delay the new page examination / load slightly.
    setTimeout(function() {
      $pending.addClass('center');
      $pending.removeClass('small star');
      clearTimeout($n.browniantimer);
    }, 420);
  });
}

/* Refresh screen dimensions, which are necessary for positioning maths. */
function parseDimensions() {
  px_width  = window.innerWidth;
  px_height = window.innerHeight;
  return {
    x: px_width / 2,
    y: px_height / 2,
    radius: Math.min(px_width, px_height) * 0.33,
    width: px_width,
    height: px_height,
  };
}

/* Primary function which handles shifting the view to a new node.
returns True or success.
*/
function examineNode($node) {
  let data = $node.data;
  let id = '' + data.pageid;
  console.log('Examining...', $node, data);
  // delete universe[id];
  delete gLevelOne[id];
  stopBrownianMotion($node);

  // New center. Remove other classes and shoot upwards.
  $center = $node;
  $center.removeClass('star small');
  // $center.addClass('center');
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
  let key = src.data.pageid + '-' + dest.data.pageid;
  // Skip if edge already exists.
  if (edges[key]) {
    return;
  }

  let line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
  let e = {
    // destid: dest.data.pageid,
    svgline: line,
    a: src,
    b: dest,
  };
  // edgeMappings[n.pagemaindata.
  // edges[src.data.pageid] = e;
  edges[key] = e;
  svgroot.appendChild(line);
}

function deleteEdge(srcid) {
  let edge = edges[srcid];
  if (!edge) {
    return;
  }
  // console.log('DELETING EDGE', srcid, edge, edge.destid);
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
    if (!src || !src[0] || src.data.expiry <= 0 ||
        !dest || !dest[0] || dest.data.expiry <= 0) {
      // !dest || dest.expiry <= 0) {
      // console.log('DELETE FROM DEST ID', dest.data.pageid, edge);
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
  $(this).delay(10).queue(function() {
    fetchPageID(spacetime);
  });

  $center = $('.pane.center');
  svgroot = document.getElementById('edges');
  console.log(svgroot);
  window.requestAnimationFrame(drawEdges);

});

// document.keypress(function(e) {
document.onkeydown = (function(e) {
  console.log(e);
  if ('Escape' === e.key) {
    demoteCenter();
  }
});
