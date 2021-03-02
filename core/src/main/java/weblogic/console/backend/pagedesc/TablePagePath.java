// Copyright (c) 2020, Oracle Corporation and/or its affiliates.
// Licensed under the Universal Permissive License v 1.0 as shown at https://oss.oracle.com/licenses/upl.

package weblogic.console.backend.pagedesc;

/** This class contains the path needed to identify the table page for an mbean type. */
public class TablePagePath extends PagePath {

  TablePagePath(PagesPath pagesPath) {
    super(pagesPath);
  }

  @Override
  public String getURI() {
    return super.getURI() + "?view=table";
  }

  @Override
  protected String computeKey() {
    return super.computeKey() + "type=<table>";
  }
}
