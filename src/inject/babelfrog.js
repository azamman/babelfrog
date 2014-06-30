BabelFrog = function(){};

//============================================================================
// State
//============================================================================

// Default options
BabelFrog.config = {};

BabelFrog.currentJob = {
  text: '',
  translation: '',
  range: null,
  x:0,
  y:0
};

//============================================================================
// Initialization
//============================================================================

BabelFrog.init = function(){
  rangy.init();

  jQuery("body").keydown(function(event) {
    // trap only Alt key
    if (event.keyCode == 18) {
      jQuery('body').addClass('BabelFrog-alt-held');
    }
  });

  jQuery("body").keyup(function(event) {
      jQuery('body').removeClass('BabelFrog-alt-held');
  });

  // support alt-clicking on links to translate them
  jQuery('a').click(function(event){
    if (event.altKey) {
      // holding ALT while clicking on a link will prevent navigation
      event.preventDefault();
      // but it's still desirable to clear the previous selection
      rangy.getSelection().removeAllRanges();
    }
  });

  // clear result box on any click (mousedown)
  jQuery('body').mousedown(function(){
    BabelFrog.hideTooltip();
  });

  // display translation of selection (mouseup)
  jQuery('body').mouseup(function(event){
    // Due to race condition triggered by re-clicking on existing selection,
    // we need to add a tiny timeout; see https://code.google.com/p/rangy/issues/detail?id=175
    window.setTimeout(function(){
      BabelFrog.translateListener(event);
    }, 10);
  });

  jQuery('body').trigger({ type: 'mouseup', button: 0 });
};

BabelFrog.setConfig = function(config){
  var defaultConfig = {
    googleTranslateJsonp: true,
    engine: BabelFrog.engines.googleTranslateFree,
    successCallback: BabelFrog.callbacks.standardSuccesCallback,
    errorCallback: BabelFrog.callbacks.standardErrorCallback,
  };

  BabelFrog.config = jQuery.extend({}, defaultConfig, config);
  console.log("running BabelFrog.setConfig");
  console.log(BabelFrog.config);

  return;
}

// TODO: update bookmarklet index.html to call boot in the new style, pass in API key
BabelFrog.boot = function(){
  BabelFrog.init();
  BabelFrog.showMessage('Loading complete, select a phrase to translate it. Alt-click a link to translate its text.');
},


//============================================================================
// Callbacks
//============================================================================

BabelFrog.callbacks = {};
BabelFrog.callbacks.standardSuccessCallback = function(translation) {
  //TODO: simplify this
  var currentJob = BabelFrog.currentJob;
  currentJob.translation = translation;
  BabelFrog.showTooltip(currentJob.text, currentJob.translation, currentJob.x, currentJob.y);
};

BabelFrog.callbacks.standardErrorCallback = function(errorMessage){
  BabelFrog.showMessage(errorMessage);
}

//============================================================================
// Tooltip/message helpers
//============================================================================

BabelFrog.showTooltip = function(text, translation, x, y){
  BabelFrog.hideTooltip();
  var a = jQuery('<p class="translation">' + translation + '</p>');
  console.log("BabelFrog is submitting the following text for translation:");
  console.log(text);

  var el = jQuery('<div id="BabelFrog-box" class="BabelFrog-box">')
    .html(a.html());

  BabelFrog.drawOverlay(el, x -5, y + 3);
};

BabelFrog.drawOverlay = function(el, x, y){

  x = x + jQuery(document).scrollLeft();
  y = y + jQuery(document).scrollTop();

  // if body positioned relative or absolute; then need to account for its offsets
  if (jQuery.css(document.body, "position") != "static") {
    x = x - jQuery('body').offset().left;
    y = y - jQuery('body').offset().top;
  }

  el.css( { 'left': x + 'px', 'top':  y + 'px' })
    .appendTo('body')
}

BabelFrog.hideTooltip = function() {
  jQuery('#BabelFrog-box').remove();
}

BabelFrog.showMessage = function(message) {
  BabelFrog.showTooltip(message, 'BabelFrog Loaded', 10, 10);
  jQuery('.BabelFrog-box').fadeOut(3000 || 0, function(){
    jQuery(this).remove();
  });
}

//============================================================================
// Rangy helpers
//============================================================================

//
BabelFrog.filterSelection = function(text) {
  // collapse multiple blank lines
  return text.replace(/\n\s*\n/g, '\n\n');
}

// helper function for translateListener, pushes a range to its boundaries
BabelFrog.expandToWordBoundary = function(range){
  var nonBoundaryPattern = /[^\s:!.,\"\(\)«»%$]/,
      startNodeValue = range.startContainer.nodeValue,
      endNodeValue = range.endContainer.nodeValue,
      start= range.startOffset,
      end = range.endOffset;

  while (start > 0 && startNodeValue && nonBoundaryPattern.test(startNodeValue[start-1])){
    start--;
  }
  while (endNodeValue && end < endNodeValue.length-1 && nonBoundaryPattern.test(endNodeValue[end])){
    end++;
  }
  range.setStart(range.startContainer,start);
  range.setEnd(range.endContainer,end);
  return range;
};

BabelFrog.drawRectangles = function(rects) {
  var drawRect = function(rect, color) {
    var el = jQuery('<div />')
              .css( {
                "position": "absolute",
                "width":(rect.width) + 'px',
                "height":(rect.height) + 'px',
                "border": "1px solid " + color,
                "background": "none",
                "z-index": "9999",
                "-webkit-user-select": "none"
              })
    BabelFrog.drawOverlay(el, rect.left , rect.top);
  }

  drawRect(window.getSelection().getRangeAt(0).getBoundingClientRect(), 'blue');

  console.log(rects);
  for (var i = 0; i < rects.length; i++) {
    var rect = rects[i];
    drawRect(rect, 'red');
    console.log(rect.top);
  }
}


//============================================================================
// Listener
//============================================================================

BabelFrog.translateListener = function(event){

  var currentJob = BabelFrog.currentJob;

  // only pay attention to left-clicks
  if (event.button!==0) {
    return;
  }

  // no text is selected
  if (rangy.getSelection().isCollapsed){
    if (event.altKey && event.target.nodeName == 'A') {
      // manually select alt-clicked link's text; see http://stackoverflow.com/a/14295222/9621
      var r = rangy.createRange(),
          sel = rangy.getSelection();
      r.selectNodeContents(event.target);
      sel.removeAllRanges();
      sel.addRange(r);
      currentJob.range = r;
    }
    else {
      return;
    }
  }
  // if there is a selection, push it to its bounding limits
  else {
    var r = rangy.getSelection().getRangeAt(0);
    BabelFrog.expandToWordBoundary(r);
    rangy.getSelection().setSingleRange(r);
    currentJob.range = r;
  }

  if (currentJob.range===null){
    rangy.getSelection().removeAllRanges();
    return;
  }

  // Instead of currentJob.range.toString(), we use the native method as its closer
  // to what the user expects than the rangy version.
  var selection = currentJob.range.nativeRange.toString();

  if (typeof selection !== 'undefined' && /\S/.test(selection) && /\D/.test(selection)){
    currentJob.text = BabelFrog.filterSelection(selection);
    var rects = currentJob.range.nativeRange.getClientRects();

    // In Chrome, these are ordered by top ascending, so we take the last one.
    // This corresponds to the "most specific" "bottom-most" rectangle, which should
    // contain the end of the selection and not much else.
    // To debug, try calling:
    //   BabelFrog.drawRectangles(rects);

    // Ocasionally, the range will end at the beginning of a node that doesn't actually
    // contain any of the selected text (just in case?). In this case, we need to position the tooltip
    // relative to the penultimate node. We check for this via range.endOffset property,
    // which specifies how many characters of the end node are included in the selection.
    // See https://dl.dropbox.com/u/29440342/screenshots/HKANHFEW-2014.06.16-11-14-06.png
    var lastIndex =  (currentJob.range.endOffset == 0) ? rects.length - 2 : rects.length - 1;

    // Align the tooltip under the last rectangle.
    currentJob.y = rects[lastIndex].bottom;
    currentJob.x = rects[lastIndex].left;

    // Each inline span element gets its own rectangle too, so we must align
    // tooltip with the left-most rectangle.
    // See https://dl.dropbox.com/u/29440342/screenshots/MPABGIGR-2014.06.16-12-09-53.png
    for (var i = 0; i < lastIndex; i++) {
      if (currentJob.x > rects[i].left) {
        currentJob.x = rects[i].left;
      }
    }

    //send request to Google
    BabelFrog.invokeTranslationEngine(currentJob);
  }
}

BabelFrog.invokeTranslationEngine = function(currentJob){
  BabelFrog.config.engine(currentJob.text);
}

//============================================================================
// Translation engines
//============================================================================

BabelFrog.engines = {};

// works well for bookmarklet, needs (paid) API key
BabelFrog.engines.googleTranslate = function(sourceText){
  jQuery.ajax({
    url:'https://www.googleapis.com/language/translate/v2',
    type: 'GET',
    dataType: BabelFrog.config.googleTranslateJsonp ? 'jsonp' : null,
    success: function(response){
      if (response.data && response.data.translations) {
        BabelFrog.config.successCallback(response.data.translations[0].translatedText);
        return;
      }

      // Google Translate reports 200 in case of error messages
      if (response.error){
        BabelFrog.config.errorCallback('Google Translate Error ' + response.error.code + ': <br/>' + response.error.message);
      }
      else {
        BabelFrog.config.errorCallback('Google Translate error: unable to parse response.');
      }
    },
    error: function(xhr, status){
      BabelFrog.config.errorCallback("Google Translate XHR error: <br/>"  + status);
    },
    data: {
      key: BabelFrog.config.googleApiKey,
      source: BabelFrog.config.source,
      target: BabelFrog.config.target,
      q: sourceText
    }
  });
}

// Potentially illegitimate use of non-public API; but many other extensions use it too.
BabelFrog.engines.googleTranslateFree = function(sourceText){
  jQuery.ajax({
    url:'http://translate.google.com/translate_a/t',
    type: 'GET',
    dataType: 'json',
    success: function(response){

      if (response && response.sentences && response.sentences.length > 0) {
        var ret = [];
        for (var i = 0; i < response.sentences.length; i++) {
          ret.push(response.sentences[i].trans);
        }
        ret = ret.join(" ");

        // google translate sends us definitions only if a single word is searched for
        if (response.dict) {
          var dictRet = [];
          for (var i = 0; i < response.dict.length; i++) {
            var def = response.dict[i];
            var base = def.base_form,
                type = def.pos,
                terms = def.terms.join(", ");

            dictRet.push("<em>(" + type + ")</em> " + def.terms.join(", "));
          }

          ret = ret + "<br/><br/>" + dictRet.join("<br/>");
        }
        BabelFrog.config.successCallback(ret);
        return;
      }

      // Google Translate reports 200 in case of error messages
      if (response.error){
        BabelFrog.config.errorCallback('Google Translate Error ' + response.error.code + ': <br/>' + response.error.message);
      }
      else {
        BabelFrog.config.errorCallback('Google Translate: unable to parse response.');
      }
    },
    error: function(xhr, status){
      BabelFrog.config.errorCallback("Google Translate XHR error: <br/>"  + status);
    },
    data: {
      client:'p',
      hl:'en',
      sc:'2',
      ie:'UTF-8',
      oe:'UTF-8',
      ssel:'0',
      tsel:'0',
      sl: BabelFrog.config.source,
      tl: BabelFrog.config.target,
      q: sourceText
    }
  });
}
