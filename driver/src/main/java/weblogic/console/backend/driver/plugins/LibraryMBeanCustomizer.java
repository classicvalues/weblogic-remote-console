// Copyright (c) 2021, Oracle and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.console.backend.driver.plugins;

import java.util.logging.Logger;
import javax.json.JsonObject;

import weblogic.console.backend.driver.InvocationContext;
import weblogic.console.backend.driver.WeblogicConfiguration;
import weblogic.console.backend.driver.WeblogicPage;
import weblogic.console.backend.pagedesc.WeblogicPageSource;

/** Custom code for processing the LibraryMBean */
public class LibraryMBeanCustomizer {

  private static final Logger LOGGER = Logger.getLogger(LibraryMBeanCustomizer.class.getName());

  /**
   * Customize the LibraryMBean's createForm's PDJ
   */
  public static void customizeCreateFormPageDefinition(
    WeblogicPage page,
    WeblogicPageSource pageSource
  ) throws Exception {
    LibraryMBeanCreateFormPDJCustomizer customizer =
      new LibraryMBeanCreateFormPDJCustomizer(page, pageSource);
    customizer.customize();
  }

  /**
   * Customize the LibraryMBean's createForm's RDJ's initial property values
   */
  public static JsonObject customizeCreateFormProperties(
    WeblogicPageSource pageSource,
    InvocationContext invocationContext,
    WeblogicConfiguration weblogicConfiguration
  ) throws Exception {
    LibraryMBeanCreateFormPropertiesCustomizer customizer =
      new LibraryMBeanCreateFormPropertiesCustomizer(
        pageSource,
        invocationContext,
        weblogicConfiguration
      );
    return customizer.customize();
  }
}
