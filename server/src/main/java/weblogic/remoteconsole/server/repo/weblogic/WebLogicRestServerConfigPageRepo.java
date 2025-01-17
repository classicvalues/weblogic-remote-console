// Copyright (c) 2021, Oracle and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.remoteconsole.server.repo.weblogic;

import weblogic.remoteconsole.common.repodef.weblogic.WebLogicRestServerConfigPageRepoDef;
import weblogic.remoteconsole.common.utils.WebLogicMBeansVersion;
import weblogic.remoteconsole.server.repo.PageReaderRepo;

/**
 * This class manages the admin server's runtime tree's configuration mbeans' pages
 * via the WebLogic REST api.
 */
public class WebLogicRestServerConfigPageRepo extends PageReaderRepo {
  public WebLogicRestServerConfigPageRepo(WebLogicMBeansVersion mbeansVersion) {
    super(
      mbeansVersion.findOrCreate(WebLogicRestServerConfigPageRepoDef.class),
      new WebLogicRestRuntimeTreeBeanRepo(mbeansVersion)
    );
  }
}
