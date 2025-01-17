// Copyright (c) 2021, Oracle and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.remoteconsole.server.repo;

import weblogic.remoteconsole.common.utils.Path;

/**
 * This class holds results of a link on a page.
 */
public class Link {
  private String label;
  private Path resourceData = new Path();

  // The link's localized label
  public String getLabel() {
    return this.label;
  }

  public void setLabel(String label) {
    this.label = label;
  }

  // The link's url relative to data provider.
  // e.g. domainRuntime/data/DomainRuntime/ServerRuntimes/AdminServer
  public Path getResourceData() {
    return this.resourceData;
  }

  public void setResourceData(Path resourceData) {
    this.resourceData = resourceData;
  }
}
