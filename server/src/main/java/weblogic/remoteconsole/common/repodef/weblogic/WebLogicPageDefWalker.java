// Copyright (c) 2021, Oracle and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.remoteconsole.common.repodef.weblogic;

import weblogic.remoteconsole.common.repodef.PageDefWalker;
import weblogic.remoteconsole.common.utils.WebLogicVersion;

/**
 * This utility class walks all of the pages for a WebLogic version.
 */
public abstract class WebLogicPageDefWalker extends PageDefWalker {
  WebLogicVersion weblogicVersion;

  protected WebLogicVersion getWebLogicVersion() {
    return this.weblogicVersion;
  }

  protected WebLogicPageDefWalker(WebLogicVersion weblogicVersion) {
    this.weblogicVersion = weblogicVersion;
  }

  protected void walk() {
    walk(weblogicVersion.findOrCreate(WebLogicRestEditPageRepoDef.class));
    walk(weblogicVersion.findOrCreate(WebLogicRestDomainRuntimePageRepoDef.class));
    // Don't walk the server config and WDT page repos since they use the same
    // page definitions as the edit edit and domain runtime page repos.
  }
}