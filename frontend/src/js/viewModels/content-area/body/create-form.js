/**
 * @license
 * Copyright (c) 2020, 2021, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */

"use strict";

define(['ojs/ojcore', 'knockout', 'ojs/ojhtmlutils', '../../../microservices/preferences/preferences', '../../../core/runtime', '../../../apis/message-displaying', '../../../apis/data-operations', '../../../microservices/navtree/navtree-manager', '../../../microservices/page-definition/types', '../../../microservices/page-definition/usedifs', '../../../microservices/page-definition/pages', '../../../microservices/page-definition/utils', '../../utils', '../../../core/cbe-types', '../../../core/cbe-utils', '../../../core/utils', 'ojs/ojlogger'],
  function (oj, ko, HtmlUtils, Preferences, Runtime, MessageDisplaying, DataOperations, NavtreeManager, PageDataTypes, PageDefinitionUsedIfs, PageDefinitionPages, PageDefinitionUtils, ViewModelUtils, CbeTypes, CbeUtils, CoreUtils, Logger) {
    /**
     *
     * @param viewParams
     * @param rerenderCallback
     * @param mode
     * @constructor
     * @throws {Error} If ``pdjData.createForm`` is "undefined" and kind !== "creatableOptionalSingleton".
     */
    function CreateForm(viewParams, rerenderCallback, mode) {
      // Create instance-scope variable for PDJ data from
      // data assigned to viewParams.parentRouter.
      this.pdjData = viewParams.parentRouter.data.pdjData();
      this.rdjData = viewParams.parentRouter.data.rdjData();

      if (CoreUtils.isUndefinedOrNull(this.pdjData.createForm)) {
        // Not working with a create form, which is okay as
        // long as kind === "creatableOptionalSingleton".
        const kind = (CoreUtils.isNotUndefinedNorNull(this.rdjData) && CoreUtils.isNotUndefinedNorNull(this.rdjData.self) && CoreUtils.isNotUndefinedNorNull(this.rdjData.self.kind) ? this.rdjData.self.kind : undefined);
        if (CoreUtils.isNotUndefinedNorNull(kind)) {
          if (kind !== "creatableOptionalSingleton") throw new Error("pdjData argument must be a Javascript object with a createForm property, or a creatableOptionalSingleton.");
        }
      }

      // No error was raised, so use viewParams to create the
      // remaining instance-scope variables.
      this.viewParams = viewParams;
      this.viewParams.onRerender = rerenderCallback;
      this.beanTree = viewParams.beanTree;
      this.pageDefinitionPages = undefined;
      // Initialize instance-scope variable used as the
      // backing data for a wizard.
      this.backingData = {
        mode: (CoreUtils.isUndefinedOrNull(mode) ? this.Mode.SCROLLING : mode),
        attributes: {},
        fileUploads: {}
      };
      // this.pdjData.createForm will be "undefined" if
      // kind === "creatableOptionalSingleton", so make
      // sure this.pdjData.createForm and
      // this.pdjData.createForm.sections aren't "undefined"
      // before calling PageDefinitionUsedIfs.getSections().
      if (CoreUtils.isNotUndefinedNorNull(this.pdjData.createForm) && CoreUtils.isNotUndefinedNorNull(this.pdjData.createForm.sections)) {
        // This is a new create form instance for a wizard, so
        // go ahead and populate this.backingData using values
        // from this.pdjData
        const sections = PageDefinitionUsedIfs.getSections(this.pdjData.createForm);
        if (sections.length === 1) {
          this.backingData.title = this.pdjData.helpPageTitle;
          this.backingData.introductionHTML = this.pdjData.introductionHTML;
          this.pageDefinitionPages = new PageDefinitionPages(sections[0].properties, this.backingData.mode);
        }
      }
    }

    function getBackingDataProperty(fieldName) {
      return this.pageDefinitionPages.findBackingDataProperty(fieldName);
    }

    function getAttributesUsedIfs() {
      let usedIfs = [];
      for (const [key, tdvrdu] of Object.entries(this.backingData.attributes)) {
        if (tdvrdu.type === "conditional" && typeof tdvrdu.usedIf.sections !== "undefined" && tdvrdu.usedIf.sections.length > 0) {
          usedIfs.push({sections: tdvrdu.usedIf.sections, fieldName: key, fieldValue: tdvrdu.value, parent: tdvrdu.usedIf.parent});
        }
      }
      return usedIfs;
    }

    function captureSectionsUsedIfs(sections, properties, usedIf) {
      // Append properties to backing data properties.
      this.pageDefinitionPages.addBackingDataProperties(properties);
      // Create parent from usedIf.fieldName and
      // usedIf.fieldValue.
      const parent = {name: usedIf.fieldName, value: usedIf.fieldValue};
      setAttributesUsedIfValues.call(this, sections, parent);
    }

    function addAttributesUsedIfValues(property, sections, parent) {
      // Only add if this.backingData.attributes[property.name]
      // doesn't exist.
      if (typeof this.backingData.attributes[property.name] === "undefined") {
        this.backingData.attributes[property.name] = {
          type: "conditional",
          default: this.rdjData.data[property.name].value,
          value: undefined,
          required: (typeof property.required === "undefined" ? false : property.required),
          visible: true,
          disabled: false,
          usedIf: {parent: parent}
        };
        if (typeof sections !== "undefined") this.backingData.attributes[property.name].usedIf.sections = sections;
      }
    }

    function deleteAttributesUsedIfProperty(propertyName) {
      // Delete backing data property with name === propertyName
      this.pageDefinitionPages.deleteBackingDataProperty(propertyName);
      // Remove entry from this.backingData.attributes.
      delete this.backingData.attributes[propertyName];
    }

    function setAttributesUsedIfValues(sections, parent) {
      const properties = this.pageDefinitionPages.getBackingDataProperties();
      properties.forEach((property) => {
        addAttributesUsedIfValues.call(this, property, sections, parent);
      });
    }

    function updateAttributeType(usedIf) {
      let sections = [];
      for (const [key, value] of Object.entries(this.backingData.attributes)) {
        // Only interested in attributes with "type": "conditional" field
        if (this.backingData.attributes[key].type === "conditional") {
          // Only interested if "conditional" type attribute has a
          // "usedIf" field, with a nested "parent" field
          if (typeof this.backingData.attributes[key].usedIf !== "undefined"
            && typeof this.backingData.attributes[key].usedIf.parent !== "undefined") {
            // Switch type to "normal" if name field of nested
            // "usedIf.parent" field, matches usedIf.parent.name
            if (this.backingData.attributes[key].usedIf.parent.name === usedIf.name) {
              // Look for usedIf fields in attribute's usedIf.sections field.
              sections = PageDefinitionUsedIfs.getAttributesUsedIfSections(this.backingData.attributes[key].usedIf.sections);
              if (sections.length > 0) {
                sections.forEach((section) => {
                  // Grab attribute with a name that matches value assigned to
                  // sections array item's usedIf.property. Update usedIf.parent
                  // of attribute that was grabbed, using current key and value.
                  this.backingData.attributes[section.usedIf.property].usedIf.parent = {name: key, value: value.value};
                });
              }
              // Change type from "conditional" to "normal", to reduce
              // the number of re-render calls.
              this.backingData.attributes[key].type = "normal";
            }
          }
        }
      }
    }

    /**
     * Returns the properties associated with attributes that have "usedIf" fields.
     * <p>Attributes are created from a combination od RDJ and PDJ dat. They are used when orchestrating which fields get rendered (or re-rendered) on a page.</p>
     * @returns {*[]}
     */
    function processAttributesUsedIfs() {
      // Get attributes that have "usedIf" fields.
      const usedIfs = getAttributesUsedIfs.call(this);
      let sections, properties = [];
      // Loop through each usedIf
      usedIfs.forEach((usedIf) => {
        sections = PageDefinitionUsedIfs.getUsedIfSections(usedIf.sections, usedIf.fieldName, usedIf.fieldValue, usedIf.parent);
        // If sections only has 1 array item, then the new
        // page we're adding will only add 1 additional field
        // to the displayed page.
        properties = PageDefinitionUsedIfs.getUsedIfSectionsProperties(usedIf);
        // We're done if properties.length is 0
        if (properties.length === 0) {
          updateAttributeType.call(this, usedIf.parent);
          this.pageDefinitionPages.markAsFinished();
        }
        else if (sections.length === 1) {
          // The properties for the new page are nested in a
          // "sections" array item (e.g. sections[0].sections[0]),
          // so we need to grab them from there.
          if (typeof sections[0].sections !== "undefined") {
            captureSectionsUsedIfs.call(this, sections[0].sections, properties, usedIf);
          }
          else {
            captureSectionsUsedIfs.call(this, sections, properties, usedIf);
            // We're done if sections[0].sections === "undefined".
            this.pageDefinitionPages.markAsFinished();
          }
        }
        else if (sections.length > 1) {
          // There are multiple "sections" array items, so
          // update "usedIf" field of TDVRVDU.
          captureSectionsUsedIfs.call(this, sections, properties, usedIf);
        }
      });
      return [...properties];
    }

    /**
     * Deletes properties and attributes entries from the backing data, which have usedIf dependencies on fieldName.
     * @param {string} fieldName The key to use when matching attribute entries
     * @returns {Array} An array containing key and value of deleted this.backingData.attributes entry
     */
    function removeUsedIfDataValues(fieldName) {
      // Add key and tdvrdu.value to array used for letting
      // the outside know which backing data properties and
      // attributes got deleted. You need to do this because
      // form.js has observables and change subscriptions
      // that may need to be deleted.
      let removed = [];
      // Use fieldName to get old value. We already know
      // it's different from the new value
      let oldValue = this.backingData.attributes[fieldName].value;
      // Loop through this.backingData.attributes entries
      for (const [key, tdvrdu] of Object.entries(this.backingData.attributes)) {
        if (typeof tdvrdu.usedIf !== "undefined" && typeof tdvrdu.usedIf.parent !== "undefined" && tdvrdu.usedIf.parent.name === fieldName) {
          deleteAttributesUsedIfProperty.call(this, key);
          removed.push({name: key, value: tdvrdu.value});
        }
        else if (key.includes(oldValue) && key !== fieldName) {
          deleteAttributesUsedIfProperty.call(this, key);
          removed.push({name: key, value: tdvrdu.value});
        }
      }

      return removed;
    }

    function getUsedIfValueFieldName(usedIfValue) {
      let fieldName;
      for (const [key, tdvrdu] of Object.entries(this.backingData.attributes)) {
        if (tdvrdu.value === usedIfValue) {
          fieldName = key;
          break;
        }
      }
      return fieldName;
    }

    /**
     * This method should only be called if this.backingData.attributes[fieldName].type === "conditional"
     * @param fieldName
     * @param fieldValue
     * @returns {{removed: Array, rerender: boolean}}
     */
    function updateUsedIfDataValue(fieldName, fieldValue) {
      let result = {rerender: false, removed: []};
      const attr = this.backingData.attributes[fieldName];
      let oldValue = attr.value;
      if (typeof oldValue !== "undefined" && oldValue !== fieldValue && !Array.isArray(oldValue)) {
        Logger.info(`[CREATEFORM] fieldName=${fieldName}, oldValue=${oldValue}, newValue=${fieldValue}`);
        result.removed = removeUsedIfDataValues.call(this, fieldName);
        result.rerender = (result.removed.length > 0);
      }

      // Update "value" field of TDVRVDU
      this.backingData.attributes[fieldName].value = fieldValue;
      return result;
    }

    function setBackingDataAttributeValue(fieldName, fieldValue) {
      if (typeof this.backingData.attributes[fieldName] !== "undefined" && this.backingData.attributes[fieldName].type === "conditional") {
        // We're on an attribute with a "conditional" type, so
        // go ahead and update "usedIf" field of the TDVRVDU
        const result = updateUsedIfDataValue.call(this, fieldName, fieldValue);
        if (fieldValue === "") this.backingData.attributes[fieldName].value = undefined;
        if (result.rerender) {
          // The change to a "usedIf" dependent field has resulted
          // in the need to do a re-render. This is typically due
          // to where the UI design decision to allow the end user
          // to repeatedly change something like the datasource
          // type or database type, has resulted in a whole lot of
          // code complexities and scenarios not present in the
          // WLS Admin console. In practice, there really is no
          // code or user benefit gained from allowing them to do
          // this, but be that as it may, we need to set fields
          // in this.backingData to facilitate allowing it, here.
          this.pageDefinitionPages.resetBackingDataFlowsAllowed();
          this.backingData.removed = result.removed;
        }
        // Invoke callback function associated with re-rendering,
        // passing in the pdjData, rdjData, flow direction and
        // array containing data on the removed fields. We need
        // to do this because:
        //
        // 1. form.js is where the instance-level variables are
        //    defined, a lot of which are referenced in form.html
        //
        // 2. Some of the instance-level variables in form.js
        //    are observables tied to form fields. When the value
        //    of those fields change, those observables need to be
        //    manipulated (e.g. be removed from subscriptions,
        //    be removed as instance-level variables).
        //
        // 3. form.js is where the code for rendering a form
        //    lives, regardless of whether it's a create or
        //    non-create form.
        //
        this.viewParams.onRerender(this.pdjData, this.rdjData, "next", result.removed);
      }
      else if (typeof this.backingData.attributes[fieldName] === "undefined") {
        // Re-rendering happens in form.js, not create-form,js.
        // The latter only sets things up to do the re-rendering.
        // We haven't re-rendered the page yet, so fieldName
        // can in fact be for "the old" instance-level observable
        // in form.js. The re-rendering will remove (and replace)
        // that instance-level observable, but until then we need
        // to use a replacer to find the this.backingData.attribute
        // entry that the end user wants to update. A replacer is
        // needed because the property names in the properties
        // for JDBC, contain spaces and other characters that cannot
        // be used when creating knockout observables. "Escaping"
        // the characters has already been tried and doesn't work.
        // The property names are harvested (and very long), and
        // something the CBE has the ability to change so the replacer
        // (and replacer logic) is not needed, at all. The replacer
        // is used pervasively in create-form.js and form.js, so
        // changing things so they are not needed would be a good
        // thing, overall.
        const replacer = this.getBackingDataAttributeReplacer(fieldName);
        if (typeof replacer !== "undefined") {
          // Loop through keys of this.backingData.attributes
          for (const key of Object.keys(this.backingData.attributes)) {
            // Look for an attribute entry with a key that ends with
            // replacer (e.g. "DbmsUser").
            if (key.endsWith(replacer)) {
              // Found one, so update "value" field of the TDVRVDU
              this.backingData.attributes[key].value = fieldValue;
              // Invoke callback function associated with re-rendering,
              // passing in the pdjData, rdjData, flow direction and
              // array containing data for "the old" instance-level
              // observable to remove, in form.json.
              this.viewParams.onRerender(this.pdjData, this.rdjData, "next", [{name: fieldName, value: fieldValue}]);
            }
          }
        }
      }
      else {
        // The change to a "usedIf" dependent field DOES NOT necessitate
        // a re-rendering.
        this.backingData.attributes[fieldName].value = fieldValue;
      }
    }

    function getBackingDataAttributeValues(fieldName) {
      let attrValues;
      if (typeof this.backingData.attributes[fieldName] !== "undefined") {
        attrValues = this.backingData.attributes[fieldName]
      }
      return attrValues;
    }

    function getBackingDataPageProperties() {
      let pageProperties = [];
      // When called from form.js, properties will only
      // contain the ones for doing a "new". With a wizard
      // there are a lot more, so we need to add them.
      if (this.pageDefinitionPages.getBackingDataPagingDirection() === "next") {
        pageProperties = processAttributesUsedIfs.call(this);
      }

      return pageProperties;
    }

    function hasIncompleteRequiredAttributes() {
      let properties = [], pageState = {succeeded: true, messages: [], summary: ""};

      if (this.pageDefinitionPages.getMode().name === "PAGING")
        properties = this.pageDefinitionPages.getBackingDataPagingProperties();
      else
        properties = this.pageDefinitionPages.getBackingDataProperties();

      const pdjTypes = new PageDataTypes(properties, this.beanTree.type);
      for (const [key, tdvrdu] of Object.entries(this.backingData.attributes)) {
        const filtered = properties.filter(property => property.name === key);
        if (tdvrdu.required && filtered.length > 0) {
          const value = pdjTypes.getConvertedObservableValue(key, tdvrdu.value);
          const completed = (typeof value !== "undefined" && value !== null);
          if (!completed) {
            const property = properties.find(property => property.name === key);
            if (typeof property !== "undefined") {
              pageState.messages.push({
                severity: "error",
                detail: oj.Translations.getTranslatedString("wrc-create-form.pageState.error.detail", property.label)
              });
              pageState.succeeded = false;
            }
          }
        }
      }
      if (!pageState.succeeded) {
        pageState.summary = oj.Translations.getTranslatedString("wrc-create-form.pageState.error.summary");
      }
      return pageState;
    }

    //public:
    CreateForm.prototype = {
      Mode: Object.freeze({
        SCROLLING : {name: "SCROLLING"},
        PAGING : {name: "PAGING"}
      }),

      isWizard: function () {
        return (typeof this.pageDefinitionPages !== "undefined");
      },

      getMode: function () {
        let mode = this.Mode.SCROLLING;
        if (typeof this.pageDefinitionPages !== "undefined") {
          mode = this.pageDefinitionPages.getMode();
        }
        return mode;
      },

      getCanBack: function () {
        return this.pageDefinitionPages.getCanBack();
      },

      getCanNext: function () {
        return this.pageDefinitionPages.getCanNext();
      },

      getCanFinish: function () {
        return this.pageDefinitionPages.getCanFinish();
      },

      markAsFinished: function () {
        const pageState = hasIncompleteRequiredAttributes.call(this);
        if (pageState.succeeded) {
          this.pageDefinitionPages.markAsFinished();
        }
        else {
          MessageDisplaying.displayErrorMessagesHTML(
            pageState.messages,
            pageState.summary,
            Preferences.notifications.autoCloseInterval()
          );
        }
        return pageState;
      },

      addUploadedFile: function(fieldName, file) {
        // Only add file, if this.backingData.attributes[fieldName] is there.
        if (typeof this.backingData.attributes[fieldName] !== "undefined") {
          this.backingData.fileUploads[fieldName] = file;
        }
      },

      clearUploadedFile: function(fieldName) {
        // Only remove file, if this.backingData.attributes[fieldName] is there.
        if (typeof this.backingData.attributes[fieldName] !== "undefined") {
          delete this.backingData.fileUploads[fieldName];
        }
      },

      addBackingDataPageData: function (fieldName) {
        // Only add fieldName, if this.backingData.attributes[fieldName] is not there.
        if (typeof this.backingData.attributes[fieldName] === "undefined") {
          const property = getBackingDataProperty.call(this, fieldName);
          const sections = PageDefinitionUsedIfs.getUsedIfSections(this.pdjData.createForm.sections, fieldName, undefined, undefined);
          // Add fieldName to attributes and set it's value to a new
          // TDVRVDU object.
          const type = (sections.length > 0 ? "conditional": "normal");
          switch(type){
            case "normal":
              this.backingData.attributes[fieldName] = {type: type, default: this.rdjData.data[fieldName].value, value: undefined, required: (typeof property.required === "undefined" ? false : property.required), visible: true, disabled: false};
              break;
            case "conditional":
              this.backingData.attributes[fieldName] = {type: type, default: this.rdjData.data[fieldName].value, value: undefined, required: (typeof property.required === "undefined" ? false : property.required), visible: true, disabled: false, usedIf: {sections: sections}};
              break;
          }
        }
      },

      backingDataAttributeValueChanged: function(fieldName, fieldValue) {
        setBackingDataAttributeValue.call(this, fieldName, fieldValue);
      },

      getBackingDataAttributeType: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") rtnval = attrValues.type;
        return rtnval;
      },

      getBackingDataAttributeDefault: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") {
          rtnval = attrValues.default;
        } else {
          if (fieldName === "Upload") {
            rtnval = this.rdjData.data[fieldName].value;
          }
        }
        return rtnval;
      },

      getBackingDataAttributeValue: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") rtnval = attrValues.value;
        return rtnval;
      },

      isRequiredBackingDataAttribute: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") rtnval = attrValues.required;
        return rtnval;
      },

      getBackingDataAttributeVisible: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") rtnval = attrValues.visible;
        return rtnval;
      },

      getBackingDataAttributeDisabled: function(fieldName) {
        let rtnval;
        const attrValues = getBackingDataAttributeValues.call(this, fieldName);
        if (typeof attrValues !== "undefined") rtnval = attrValues.disabled;
        return rtnval;
      },

      getBackingDataAttributeData: function(fieldName) {
        return getBackingDataAttributeValues.call(this, fieldName);
      },

      getBackingDataAttributeReplacer: function(fieldName) {
        let replacer, delimPos = fieldName.indexOf("_COLON_");
        if (delimPos !== -1) {
          delimPos = fieldName.lastIndexOf("_");
          replacer = fieldName.substring(delimPos + 1);
        }
        return replacer;
      },

      getRenderProperties: function() {
        return this.pageDefinitionPages.getBackingDataProperties();
      },

      rerenderPage: function(direction) {
        this.pageDefinitionPages.setBackingDataPagingDirection(direction);
        const pageState = {succeeded: true};
        this.pageDefinitionPages.selectBackingDataProperties(direction);
        return {succeeded: pageState.succeeded, canBack: this.getCanBack(), canNext: this.getCanNext(), canFinish: this.getCanFinish()};
      },

      /**
       * Returns object used to create payload for HTTP POST to CBE
       * @param {[object]} properties Array of property objects for the create form.
       * @param {object} fieldValues An object containing knockout observables, for each property in  properties
       * @param {object} fieldValuesFrom An object containing knockout observables, for where each property in properties is from.
       * This will be null if not WDT.
       */
      getDataPayload: function (properties, fieldValues, fieldValuesFrom){
        if (this.isWizard()) {
          this.backingData.hasMultiFormData = false;

          let pageProperties = getBackingDataPageProperties.call(this);

          // processAttributesUsedIfs() may have added new properties
          // Update properties from backing data properties.
          properties = this.pageDefinitionPages.getBackingDataProperties();

          if (this.pageDefinitionPages.getMode() === this.Mode.PAGING && !this.pageDefinitionPages.isFinished()) {
            if (this.getCanFinish()) {
              pageProperties = this.pageDefinitionPages.getBackingDataPagingProperties();
            }
            if (pageProperties.length > 0) {
              properties = pageProperties;
            }
          }
        }

        // Declare local variable used to store data payload
        // composed for an HTTP POST.
        let dataPayload = {};

        const pdjTypes = new PageDataTypes(properties, this.beanTree.type);

        // Fill in the payload from each property that
        // appears in the list of create form properties.
        properties.forEach((property, index) => {
          let value = null;
          const name = property.name;

          if (this.isWizard()) {
            if (!this.backingData.hasMultiFormData) {
              this.backingData.hasMultiFormData = (property.type === "fileContents");
            }

            if (typeof this.backingData.removed !== "undefined") {
              // Get the value from removed
              const replacer = this.getBackingDataAttributeReplacer(name);
              if (typeof replacer !== "undefined") {
                const entry = this.backingData.removed.find(entry => entry.name.endsWith(replacer));
                if (typeof entry !== "undefined") {
                  this.backingData.attributes[name].value = entry.value;
                }
              }
            }

            if (typeof this.backingData.attributes[name] !== "undefined") {
              if (typeof this.backingData.attributes[name].value !== "undefined") {
                if (CoreUtils.isUndefinedOrNull(fieldValuesFrom)) {
                  value = pdjTypes.getConvertedObservableValue(name, this.backingData.attributes[name].value);
                }
                else {
                  let from = "fromRegValue";
                  if (CoreUtils.isNotUndefinedNorNull(fieldValuesFrom[name])){
                    from = fieldValuesFrom[name]();
                  }
                  value = pdjTypes.getConvertedObservableValue_WDT(name, this.backingData.attributes[name].value, from);
                }
              }
            }
          }
          else {
            // Get the value from the observable passed
            // in fieldValues parameter.
            const fieldObv = fieldValues[name];
            if (typeof fieldObv !== "undefined") {
              if (CoreUtils.isUndefinedOrNull(fieldValuesFrom))
                value = pdjTypes.getConvertedObservableValue(name, fieldObv());
              else
                value = pdjTypes.getConvertedObservableValue_WDT(name, fieldObv(), fieldValuesFrom[name]());
            }
          }

          // Check for no value and update the payload.
          if (value === null) {
            let defaultValue = this.getBackingDataAttributeDefault(name);
            if (typeof defaultValue !== 'undefined') {
              value = defaultValue;
            }
            if (value === null && pdjTypes.isStringType(name) || pdjTypes.isSecretType(name)) {
              value = "";
            }
          }
          if (CoreUtils.isUndefinedOrNull(fieldValuesFrom))
            dataPayload[name] = { value: value };
          else {
            if (CoreUtils.isNotUndefinedNorNull(fieldValuesFrom[name])  && fieldValuesFrom[name]() === "fromModelToken"){
              dataPayload[name] = value;
            } else
              dataPayload[name] = { value: value };
          }
        });

        if (this.isWizard()) {
          if (typeof this.backingData.removed !== "undefined") delete this.backingData.removed;
          this.pageDefinitionPages.addBackingDataPagingPageProperties([...properties]);
          if (!this.pageDefinitionPages.getCanFinish()) properties = this.pageDefinitionPages.getBackingDataPagingProperties();
        }

        return {properties: properties, data: dataPayload};
      },

      hasDeploymentPathData: function () {
        let rtnval = (typeof this.backingData.attributes["SourcePath"] !== "undefined");
        if (!rtnval && CoreUtils.isNotUndefinedNorNull(this.pdjData.createForm) &&  CoreUtils.isNotUndefinedNorNull(this.pdjData.createForm.properties)) {
          const index = this.pdjData.createForm.properties.map(property => property.name).indexOf("SourcePath");
          rtnval = (index !== -1);
        }
        return rtnval;
      },

      scrubDataPayload: function(dataPayload) {
        let dataPayload1;
        if (CoreUtils.isNotUndefinedNorNull(dataPayload)) {
          dataPayload1 = JSON.parse(JSON.stringify(dataPayload));
          // Remove any field that has '' as a value.
          const arr = Object.entries(dataPayload1);
          const filtered = arr.filter(([key, value]) => value !== null && value.value !== '');
          dataPayload1 = Object.fromEntries(filtered);
          // CBE everypage examples have no "Upload" field in
          // the dataPayload, so we need to remove it before
          // we create the multipart section for it.
          delete dataPayload1["Upload"];
          // Remove "label" field from "Targets"
          if (CoreUtils.isNotUndefinedNorNull(dataPayload1["Targets"])) {
            if (CoreUtils.isUndefinedOrNull(dataPayload1["Targets"].value)) {
              // Remove "Targets" field itself
              delete dataPayload1["Targets"];
            }
            else {
              // Remove "label" field from "Targets" field
              for (let i = 0; i < dataPayload1["Targets"].value.length; i++) {
                delete dataPayload1["Targets"].value[i].label;
                //if this is in WDT, it maybe using model token, and value will not exist.
                if (CoreUtils.isNotUndefinedNorNull(dataPayload1["Targets"].value[i].value)){
                  delete dataPayload1["Targets"].value[i].value.label;
                }
              }
            }
          }
          // Remove "PlanPath" field, if the value is empty
          if (CoreUtils.isNotUndefinedNorNull(dataPayload1["PlanPath"]) && dataPayload1["PlanPath"].value === "") {
            delete dataPayload1["PlanPath"];
          }

        }
        // Return scrubbed dataPayload
        return dataPayload1;
      },

      getDeploymentDataPayload: function (properties, fieldValues) {
        // Get the dataPayload
        const results = this.getDataPayload(properties, fieldValues);
        // Remove extraneous fields from results.data and return it
        results.data = this.scrubDataPayload(results.data);
        return results;
      },

      hasMultiFormData: function () {
        return (Object.keys(this.backingData.fileUploads).length > 0);
      },

      postMultiFormDataPayload: function (properties, fieldValues) {
        const self = this;
        return new Promise(function (resolve, reject) {
          // Get the dataPayload
          let results = self.getDataPayload(properties, fieldValues);
          // Remove extraneous fields from results.data
          results.data = self.scrubDataPayload(results.data);
          // Create FormData object that we'll be populating
          // from scratch.
          const formData = new FormData();
          // Find properties with "type": "fileContents" field
          const fields = properties.filter(property => property.type === "fileContents");
          // Use property.name to get File onject that was saved
          // in this.backingData.fileUploads map.
          fields.forEach((field) => {
            if (typeof self.backingData.fileUploads[field.name] !== "undefined") {
              // Add multipart sections using file
              formData.append(
                field.name,
                self.backingData.fileUploads[field.name],
                results.data[field.name].value
              );
              delete results.data[field.name];
            }
            else {
              // Remove field.name from results.data, if there
              // is no file upload for it. This prevents sending
              // a "Plan": {value: ""} (or "Plan": {value: null})
              // field to the CBE, in results.data object.
              delete results.data[field.name];
            }
          });

          // Add multipart section for 'requestBody' part, using
          // the current state of the results.data object.

          formData.append(
            'requestBody',
            new Blob([JSON.stringify({
              data: results.data
            })], {type: "application/json"})
          );

          Logger.info(`[CREATEFORM] formData.requestBody=${formData.get("requestBody")}`);
          Logger.info(`[CREATEFORM] formData.Source=${formData.get("Source")}`);
          Logger.info(`[CREATEFORM] formData.Plan=${formData.get("Plan")}`);

          // Create the multipart request and POST it.
          DataOperations.mbean.upload(self.viewParams.parentRouter.data.rdjUrl(), formData)
            .then(reply => {
              resolve(reply);
            })
            .catch(response => {
              reject(response);
            });
        });
      },

      newBean: function() {
        const self = this;
        return new Promise(function (resolve) {
          const newUri = `${self.rdjData.self.resourceData}?view=createForm`;
          return DataOperations.mbean.new(newUri)
            .then(reply => {
              const rdjData = reply.body.data.get("rdjData");
              const kind = (CoreUtils.isNotUndefinedNorNull(rdjData) && CoreUtils.isNotUndefinedNorNull(rdjData.self) && CoreUtils.isNotUndefinedNorNull(rdjData.self.kind) ? rdjData.self.kind : undefined);
              const isRdjData = (CoreUtils.isNotUndefinedNorNull(rdjData) && CoreUtils.isNotUndefinedNorNull(rdjData.data) && (Object.keys(rdjData.data).length !== 0) ? true : false);
              if (!isRdjData && CoreUtils.isNotUndefinedNorNull(kind) && kind === "creatableOptionalSingleton") {
                const createUrl = `${Runtime.getBackendUrl()}${rdjData.self.resourceData}?action=create`;
                return DataOperations.mbean.save(createUrl, rdjData.data);
              }
              else {
                return Promise.resolve(reply);
              }
            })
            .then(reply => {
              // Look for the uri of the created singleton which had no create form
              // Otherwise fallback to the uri that is found in the create form
              let getUri = reply.body.data.resourceData?.resourceData;
              if (CoreUtils.isUndefinedOrNull(getUri)) {
                getUri = reply.body.data.get("rdjData").createForm.resourceData;
              }
              DataOperations.mbean.get(getUri)
                .then(reply => {
                  resolve(reply);
                });
            });
        });
      },

      deleteBean: function(resourceData) {
        const self = this;
        return new Promise(function (resolve) {
          DataOperations.mbean.delete(resourceData)
            .then(reply => {
              // The "Delete" button can appear on a form when the identity
              // kind is "creatableOptionalSingleton". If that's the case,
              // we need to use the CbeUtils.extractBeanPath() function, so
              // we have what we need when signaling that the shopping cart
              // was modified.
              self.viewParams.signaling.shoppingCartModified.dispatch("form", "delete", {
                isLockOwner: true,
                hasChanges: true,
                supportsChanges: true
              }, resourceData);

              resolve(reply);
            });
        });
      }

    };

    // Return CreateForm constructor function
    return CreateForm;
  }
);