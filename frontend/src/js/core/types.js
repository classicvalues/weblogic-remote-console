/**
 * @license
 * Copyright (c) 2020, 2021, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */
"use strict";

/**
 * Module containing core constants for the CFE
 * @module
 */
define(
  function(){
    return {
      Console: {
        /** @type {{ONLINE: {name: string}, OFFLINE: {name: string}, DETACHED: {name: string}}} */
        RuntimeMode: Object.freeze({
          ONLINE: {name: "ONLINE"},   // should make connectivity indicator "green"
          OFFLINE: {name: "OFFLINE"}, // should make connectivity indicator "yellow"
          DETACHED: {name: "DETACHED"}  // should make connectivity indicator "red"
        }),
        runtimeModeFromName: function(name) {
          return Object.values(this.RuntimeMode).find(runtimeMode => runtimeMode.name === name);
        }
      },
      Domain: {
        /** @type {{CONNECTED: {name: string}, DISCONNECTED: {name: string}}} */
        ConnectState: Object.freeze({
          CONNECTED: {name: "connected"},
          DISCONNECTED: {name: "disconnected"}
        }),
        connectStateFromName: function (name) {
          return Object.values(this.ConnectState).find(connectState => connectState.name === name);
        }
      },
      /** @type {{TRANSPORT: {name: string}, NOT_FOUND: {name: string}, CBE_REST_API: {name: string}, UNEXPECTED: {name: string}}} */
      FailureType: Object.freeze({
        TRANSPORT: {name: "TRANSPORT"},
        NOT_FOUND: {name: "NOT_FOUND"},
        CBE_REST_API: {name: "CBE_REST_API"},
        UNEXPECTED: {name: "UNEXPECTED"}
      }),
      failureTypeFromName: function (name) {
        return Object.values(this.FailureType).find(failureType => failureType.name === name);
      }

    };
  });