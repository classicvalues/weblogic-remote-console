/**
 * @license
 * Copyright (c) 2020, 2021 Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */

"use strict";

/**
 * Class for calculating the actual ``min-height`` of a form or table container, in the Content Area.
 * @module
 * @class
 * @classdesc Class for calculating the actual ``min-height`` of a form or table container, in the Content Area.
 */
define(['../../../microservices/perspective/perspective-memory-manager', '../../../core/cfe-errors'],
  function (PerspectiveMemoryManager, CfeErrors) {

  //public:
    /**
     * Create a new resizer for the Content Area
     * @constructor
     * @param {Perspective} perspective
     * @typedef ContentAreaContainerResizer
     */
    function ContentAreaContainerResizer(perspective){
      var _wasHelpVisible = false;
      this.setWasHelpVisible = function(visible) { _wasHelpVisible = visible;};
      this.getWasHelpVisible = function() { return _wasHelpVisible; };
      this.perspectiveMemory = PerspectiveMemoryManager.getPerspectiveMemory(perspective.id);
    }

    ContentAreaContainerResizer.prototype = {
      /**
       * Returns the actual number of pixels to use, for ``max-height`` of the form or table container.
       * <p>This is a calculation based on the information in the options parameter, as well as height calculations that take into consideration that the container is in a Flexbox layout.</p>
       * @param {string} containerDOMSelector
       * @param {{withHistoryVisible: boolean, withHelpVisible: boolean}} options
       * @returns {number}
       * @throws {CfeError} - If ``document.querySelector(containerDOMSelector)`` returns null
       */
      getOffsetMaxHeight: function(containerDOMSelector, options) {
        const getOffsetTop = element => {
          let offsetTop = 0;
          while(element) {
            offsetTop += element.offsetTop;
            element = element.offsetParent;
          }
          return offsetTop;
        };

        const container = document.querySelector(containerDOMSelector);
        if (container === null) {
          throw new CfeErrors.CfeError(`Null returned when looking up '${containerDOMSelector}' in the DOM.`);
        }

        options.withHistoryVisible = options.withHistoryVisible || false;
        options.withHelpVisible = options.withHelpVisible || false;

        // Get what perspective memory has for current
        // state of beanPath history visibility.
        const wasHistoryVisible = this.perspectiveMemory.historyVisibility.call(this.perspectiveMemory);
        // Get what private instance variable has for
        // current state of help visibility.
        const wasHelpVisible = this.getWasHelpVisible();
        // Set initial value of return variable to the
        // height of the fixed footer (60px), plus it's
        // margin-top (5px), plus it's margin-bottom (5px).
        let offsetValue = 70;

        if (wasHistoryVisible && !options.withHistoryVisible) {
          offsetValue -= (wasHelpVisible && options.withHelpVisible ? 40 : 30);
        }
        if (wasHelpVisible && options.withHelpVisible) {
          if (!wasHistoryVisible && options.withHistoryVisible) {
            offsetValue += 40;  // 110
          }
        }
        else if (options.withHelpVisible) {
          if (wasHelpVisible) offsetValue -= 40;
        }
        else if (options.withHistoryVisible) {
          offsetValue += (!wasHistoryVisible ? 40 : 0);
        }

        this.perspectiveMemory.setHistoryVisibility.call(this.perspectiveMemory, options.withHistoryVisible);
        this.setWasHelpVisible(options.withHelpVisible);

        const offsetTop = getOffsetTop(container);
        return offsetTop + offsetValue;
      }
    };

    // Return ContentAreaContainerResizer constructor function
    return ContentAreaContainerResizer;
  }
);
