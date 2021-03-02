/**
 * @license
 * Copyright (c) 2020 Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */
"use strict";

define(['knockout', 'ojs/ojarraydataprovider', '../../cfe/services/perspective/perspective-memory-manager', 'ojs/ojlogger', '../../cfe/common/utils'],
  function (ko, ArrayDataProvider, PerspectiveMemoryManager, Logger, Utils) {

    function BeanPathManager(perspectiveId, countObservable){
      this.perspectiveMemory = PerspectiveMemoryManager.getPerspectiveMemory(perspectiveId);
      this.beanPathHistory = ko.observableArray(this.perspectiveMemory.history());
      this.beanPathHistoryOptions = new ArrayDataProvider(this.beanPathHistory, { keyAttributes: 'value' });
      this.beanPathHistoryCount = countObservable;
    }

    function isValidBeanPathHistoryPath(path) {
      return (typeof path !== "undefined" && path !== "undefined" && !path.startsWith("form")  && !path.startsWith("table"));
    }

    function trimPathParam(pathParam) {
      pathParam = Utils.removeTrailingSlashes(pathParam);

      if (pathParam.startsWith("//")) {
        pathParam = pathParam.substring(2);
      }
      else if (":/".includes(pathParam.charAt(0))) {
        pathParam = pathParam.substring(1);
      }
      return pathParam;
    }

  //public:
    BeanPathManager.prototype = {
      /**
       * @param {string} pathParam
       * @param {[string]} breadcrumbLabels
       */
      addBeanPath: function (pathParam, breadcrumbLabels) {
        if (typeof pathParam === "undefined" || pathParam.startsWith("undefined")) pathParam = "";

        const actualPathParam = trimPathParam(pathParam);
        const breadcrumbsPath = (breadcrumbLabels.length > 0 ? breadcrumbLabels.join("/") : actualPathParam);

        let result = ko.utils.arrayFirst(this.beanPathHistory(), (beanpath) => {
          return beanpath['value'] === actualPathParam;
        });

        const breadcrumbsLabel = decodeURIComponent(breadcrumbsPath.replace(/\//g, " | "));
        if (typeof result !== "undefined") {
          result.label = breadcrumbsLabel;
        }
        else if (isValidBeanPathHistoryPath(actualPathParam) && actualPathParam !== "/") {
          // Only add Path if it's not already in beanPathHistory
          this.beanPathHistory.push({
            value: actualPathParam,
            label: breadcrumbsLabel
          });
        }
        this.beanPathHistoryCount(this.beanPathHistory().length);
      },

      /**
       * @param {string} pathParam
       */
      removeBeanPath: function (pathParam) {
        if (typeof pathParam === "undefined" || pathParam.startsWith("undefined")) pathParam = "";

        pathParam = trimPathParam(pathParam);

        const filteredBeanPaths = this.beanPathHistory().filter(beanpath => beanpath.value !== pathParam);

        this.beanPathHistory(filteredBeanPaths);
        this.beanPathHistoryCount(this.beanPathHistory().length);
        this.perspectiveMemory.setHistory(this.beanPathHistory());
      },

      isHistoryOption: function (value) {
        const option = this.beanPathHistory().find(item => item.value === value);
        return (typeof option !== "undefined");
      },

      resetHistory: function () {
        this.beanPathHistory.valueWillMutate();
        this.beanPathHistory.removeAll();
        this.beanPathHistory.valueHasMutated();
        this.beanPathHistoryCount(this.beanPathHistory().length);
      },

      getBreadcrumbsPath: function (pathParam) {
        if (typeof pathParam === "undefined" || pathParam.startsWith("undefined")) pathParam = "";

        pathParam = trimPathParam(pathParam);

        const option = this.beanPathHistory().find(item => item.value === pathParam);
        return (typeof option !== "undefined" ? option.label : pathParam);
      },

      getHistoryOptions: function () {
        return this.beanPathHistoryOptions;
      },

      saveHistoryOptions: function (folderName) {
      },

      loadHistoryOptions: function (folderName) {
      },

      getHistoryVisibility: function () {
        return this.perspectiveMemory.historyVisibility();
      },

      setHistoryVisibility: function (visible) {
        this.perspectiveMemory.setHistoryVisibility(visible);
      }

    };

    // Return constructor function
    return BeanPathManager;
  }
);
